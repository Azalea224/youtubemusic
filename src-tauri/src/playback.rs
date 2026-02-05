use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::atomic::AtomicU16;
use std::sync::atomic::Ordering;
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager};

use crate::plugins;
use crate::settings::SettingsStore;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlaybackState {
    pub title: String,
    pub artist: String,
    pub album: String,
    pub state: String,
    pub progress: u64,
    pub duration: u64,
}

impl Default for PlaybackState {
    fn default() -> Self {
        Self {
            title: String::new(),
            artist: String::new(),
            album: String::new(),
            state: "paused".to_string(),
            progress: 0,
            duration: 0,
        }
    }
}

static POLL_PORT: AtomicU16 = AtomicU16::new(0);

#[allow(dead_code)]
pub fn get_poll_port() -> u16 {
    POLL_PORT.load(Ordering::Relaxed)
}

use std::sync::Mutex;
static LAST_PLAYBACK: Mutex<Option<PlaybackState>> = Mutex::new(None);

pub fn set_last_playback(state: PlaybackState) {
    if let Ok(mut g) = LAST_PLAYBACK.lock() {
        *g = Some(state);
    }
}

pub fn get_last_playback() -> Option<PlaybackState> {
    if let Ok(g) = LAST_PLAYBACK.lock() {
        g.clone()
    } else {
        None
    }
}

fn make_poll_script(port: u16) -> String {
    format!(
        r#"
(function(){{
  try {{
    function q(root,sel){{
      if(!root)return null;
      var sr=root.shadowRoot||root._shadowRoot;
      if(sr){{var r=sr.querySelector(sel);if(r)return r;}}
      if(root.__shady_native_querySelector)return root.__shady_native_querySelector(sel);
      return root.querySelector(sel);
    }}
    function qTree(r,s){{
      var x=q(r,s);if(x)return x;
      for(var el=r.querySelectorAll('*'),i=0;i<el.length;i++){{
        var sr=el[i].shadowRoot||el[i]._shadowRoot;
        if(sr){{x=sr.querySelector(s);if(x)return x;}}
      }}
      var sr=r.shadowRoot||r._shadowRoot;
      if(sr){{x=sr.querySelector(s);if(x)return x;}}
      return null;
    }}
    var bar=document.querySelector('ytmusic-player-bar');
    var t=bar?q(bar,'.title.ytmusic-player-bar')||q(bar,'.title'):null;
    if(!t)t=qTree(document.body,'#title yt-formatted-string, .title yt-formatted-string');
    var s=bar?q(bar,'.ytmusic-player-bar.subtitle')||q(bar,'.subtitle'):null;
    if(!s)s=qTree(document.body,'#subtitle yt-formatted-string, .subtitle yt-formatted-string');
    var artistLinks=bar&&(bar.shadowRoot||bar._shadowRoot)?(bar.shadowRoot||bar._shadowRoot).querySelectorAll('.ytmusic-player-bar.subtitle a[href*="channel/"]'):[];
    if(artistLinks&&artistLinks[0])s=artistLinks[0];
    var p=bar?q(bar,'#play-pause-button')||q(bar,'.play-pause-button'):null;
    if(!p)p=qTree(document.body,'#play-pause-button, .play-pause-button');
    var title=t?t.textContent.trim():'';
    var artist=s?s.textContent.trim():'';
    var state='paused';
    if(p){{var l=(p.getAttribute('aria-label')||'').toLowerCase();state=l.indexOf('pause')>=0?'playing':'paused';}}
    var prog=0,dur=0;
    var te=bar?q(bar,'.time-info')||q(bar,'.time'):null;
    if(!te)te=qTree(document.body,'.time-info, .time');
    if(te){{
      var txt=te.textContent||'0:00 / 0:00';
      var pts=txt.split('/').map(function(x){{return x.trim();}});
      if(pts.length>=2){{
        function parse(str){{var p=str.split(':').map(Number).reverse(),sec=0;for(var i=0;i<p.length;i++)sec+=(p[i]||0)*Math.pow(60,i);return sec;}}
        prog=parse(pts[0]);dur=parse(pts[1]);
      }}
    }}
    var json=JSON.stringify({{title:title,artist:artist,album:'',state:state,progress:prog,duration:dur}});
    if(title||artist){{
      var img=new Image();
      img.src='http://127.0.0.1:{}/playback?data='+encodeURIComponent(json);
    }}
  }}catch(e){{}}
}})();
"#,
        port
    )
}

const POLL_SERVER_PORT: u16 = 38475;

fn make_settings_button_script() -> String {
    crate::plugins::get_settings_button_script().to_string()
}

/// Re-inject plugins and custom CSS/JS into the main webview. Called when settings change.
pub fn apply_settings_to_main_webview(app: &AppHandle) {
    let Some(webview) = app.get_webview_window("main") else {
        return;
    };
    let enabled: Vec<String> = app
        .try_state::<SettingsStore>()
        .and_then(|s| {
            s.0.get("plugins")
                .and_then(|v| v.get("enabled_plugins").cloned())
                .and_then(|v| v.as_array().map(|a| a.to_vec()))
        })
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str().map(String::from))
                .collect()
        })
        .filter(|v: &Vec<String>| !v.is_empty())
        .unwrap_or_else(|| vec!["lyrics".to_string(), "fine-volume-control".to_string()]);
    let app_data_dir = app
        .path()
        .app_data_dir()
        .unwrap_or_else(|_| PathBuf::from("."));
    let plugin_script = plugins::get_plugin_injection_script(&app_data_dir, &enabled);
    if !plugin_script.is_empty() {
        let _ = webview.eval(&plugin_script);
    }
    let (custom_css, custom_js): (String, String) = app
        .try_state::<SettingsStore>()
        .and_then(|s| {
            let adv = s.0.get("advanced")?;
            let css = adv.get("custom_css").and_then(|v| v.as_str()).unwrap_or("").to_string();
            let js = adv.get("custom_js").and_then(|v| v.as_str()).unwrap_or("").to_string();
            Some((css, js))
        })
        .unwrap_or_else(|| (String::new(), String::new()));
    if !custom_css.is_empty() {
        let escaped = serde_json::to_string(&custom_css).unwrap_or_else(|_| "".to_string());
        let script = format!(
            r#"(function(){{
                var el = document.getElementById('ytm-custom-css');
                if (el) el.remove();
                if (!document.head) return;
                el = document.createElement('style');
                el.id = 'ytm-custom-css';
                el.textContent = JSON.parse({});
                document.head.appendChild(el);
            }})();"#,
            escaped
        );
        let _ = webview.eval(&script);
    } else {
        let _ = webview.eval("(function(){ var el=document.getElementById('ytm-custom-css'); if(el)el.remove(); })();");
    }
    if !custom_js.is_empty() {
        let _ = webview.eval(&custom_js);
    }
}

pub fn start_playback_polling(app: AppHandle) {
    let addr = format!("127.0.0.1:{}", POLL_SERVER_PORT);
    let server = match tiny_http::Server::http(&addr) {
        Ok(s) => s,
        Err(_) => return,
    };
    POLL_PORT.store(POLL_SERVER_PORT, Ordering::Relaxed);

    let app_clone = app.clone();
    thread::spawn(move || {
        for stream in server.incoming_requests() {
            let url = stream.url().to_string();
            if url.starts_with("/playback?") {
                if let Some(query) = url.strip_prefix("/playback?") {
                    if let Some(data) = query.strip_prefix("data=") {
                        if let Ok(decoded) = urlencoding::decode(data) {
                            if let Ok(state) = serde_json::from_str::<PlaybackState>(&decoded) {
                                set_last_playback(state.clone());
                                let _ = app_clone.emit("playback-update", &state);
                            }
                        }
                    }
                }
            }
            let response = tiny_http::Response::from_string("").with_status_code(204);
            let _ = stream.respond(response);
        }
    });

    let app = app.clone();
    thread::spawn(move || {
        let mut plugin_inject_counter: u32 = 0;
        loop {
            thread::sleep(Duration::from_secs(2));
            if let Some(webview) = app.get_webview_window("main") {
                let script = make_poll_script(POLL_SERVER_PORT);
                let _ = webview.eval(&script);
                let _ = webview.eval(&make_settings_button_script());

                plugin_inject_counter = plugin_inject_counter.saturating_add(1);
                if plugin_inject_counter <= 1 || plugin_inject_counter % 8 == 0 {
                    let enabled: Vec<String> = app
                        .try_state::<crate::settings::SettingsStore>()
                        .and_then(|s| {
                            s.0.get("plugins")
                                .and_then(|v| v.get("enabled_plugins").cloned())
                                .and_then(|v| v.as_array().map(|a| a.to_vec()))
                        })
                        .map(|arr| {
                            arr.iter()
                                .filter_map(|v| v.as_str().map(String::from))
                                .collect()
                        })
                        .filter(|v: &Vec<String>| !v.is_empty())
                        .unwrap_or_else(|| vec!["lyrics".to_string(), "fine-volume-control".to_string()]);
                    let app_data_dir = app
                        .path()
                        .app_data_dir()
                        .unwrap_or_else(|_| PathBuf::from("."));
                    let plugin_script =
                        crate::plugins::get_plugin_injection_script(&app_data_dir, &enabled);
                    if !plugin_script.is_empty() {
                        let _ = webview.eval(&plugin_script);
                    }
                }
            }
        }
    });
}
