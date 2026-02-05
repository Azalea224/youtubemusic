mod discord;
mod lyrics;
mod playback;
mod plugins;
mod settings;

use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::utils::config::WebviewUrl;
use tauri::webview::PageLoadEvent;
use tauri::{Listener, Manager, WebviewWindowBuilder};
use tauri_plugin_store::StoreExt;

use discord::{update_discord_presence, DiscordState};
use lyrics::fetch_lyrics;
use playback::{get_last_playback, start_playback_polling, PlaybackState};
use settings::{get_settings, set_settings, SettingsStore};

#[tauri::command]
fn get_playback_state() -> Option<PlaybackState> {
    get_last_playback()
}

#[tauri::command]
fn debug_plugins(app: tauri::AppHandle) -> Result<serde_json::Value, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    let plugins_dir = app_data_dir.join("plugins");
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
    let plugin_script = plugins::get_plugin_injection_script(&app_data_dir, &enabled);
    Ok(serde_json::json!({
        "app_data_dir": app_data_dir.to_string_lossy(),
        "plugins_dir_exists": plugins_dir.exists(),
        "enabled_plugins": enabled,
        "script_length": plugin_script.len(),
        "script_preview": if plugin_script.len() > 200 { format!("{}...", &plugin_script[..200]) } else { plugin_script.clone() }
    }))
}

#[tauri::command]
fn open_settings(app: tauri::AppHandle) {
    if let Some(w) = app.get_webview_window("settings") {
        let _ = w.show();
        let _ = w.set_focus();
    }
}

#[tauri::command]
fn list_plugins(app: tauri::AppHandle) -> Vec<(String, plugins::PluginManifest)> {
    let path = app.path().app_data_dir().unwrap_or_else(|_| std::path::PathBuf::from("."));
    plugins::scan_plugins_dir(&path)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            get_settings,
            set_settings,
            get_playback_state,
            list_plugins,
            debug_plugins,
            fetch_lyrics,
            open_settings,
        ])
        .setup(|app| {
            let store = app.store("settings.json")?;
            app.manage(SettingsStore(store));
            app.manage(DiscordState::new());

            plugins::ensure_default_plugins(&app.handle());

            let settings_script = plugins::get_settings_button_script();
            let main_url = WebviewUrl::External(
                "https://music.youtube.com"
                    .parse()
                    .expect("valid url"),
            );
            let _main = WebviewWindowBuilder::new(app, "main", main_url)
                .title("YouTube Music")
                .inner_size(1200.0, 800.0)
                .min_inner_size(400.0, 300.0)
                .on_page_load(move |window, payload| {
                    if payload.event() == PageLoadEvent::Finished {
                        if payload.url().host_str().map_or(false, |h| h.contains("music.youtube.com")) {
                            let _ = window.eval(settings_script);
                            playback::apply_settings_to_main_webview(&window.app_handle());
                        }
                    }
                })
                .build()?;
            #[cfg(debug_assertions)]
            if std::env::var("YTM_DEBUG").is_ok() {
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.open_devtools();
                }
            }

            let settings_url = WebviewUrl::App("index.html".into());
            let _settings = WebviewWindowBuilder::new(app, "settings", settings_url)
                .title("Settings - YouTube Music")
                .inner_size(600.0, 550.0)
                .visible(false)
                .build()?;

            let tray_show_i = MenuItem::with_id(app, "show", "Show", true, None::<&str>)?;
            let tray_settings_i = MenuItem::with_id(app, "settings", "Settings", true, None::<&str>)?;
            let tray_quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let tray_menu = Menu::with_items(app, &[&tray_show_i, &tray_settings_i, &tray_quit_i])?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&tray_menu)
                .tooltip("YouTube Music - Left-click for menu")
                .show_menu_on_left_click(true)
                .on_tray_icon_event(move |tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.set_focus();
                        }
                    }
                })
                .on_menu_event(move |app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.set_focus();
                        }
                    }
                    "settings" => {
                        if let Some(w) = app.get_webview_window("settings") {
                            let _ = w.show();
                            let _ = w.set_focus();
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .build(app)?;

            #[cfg(desktop)]
            {
                use tauri_plugin_global_shortcut::{Code, Modifiers, Shortcut, ShortcutState};
                let settings_mod = if cfg!(target_os = "macos") { Modifiers::SUPER } else { Modifiers::CONTROL };
                let settings_shortcut = Shortcut::new(Some(settings_mod | Modifiers::SHIFT), Code::KeyS);
                let handle = app.handle().clone();
                app.handle().plugin(
                    tauri_plugin_global_shortcut::Builder::new()
                        .with_shortcut(settings_shortcut)?
                        .with_handler(move |_app, _shortcut, event| {
                            if event.state() == ShortcutState::Pressed {
                                if let Some(w) = handle.get_webview_window("settings") {
                                    let _ = w.show();
                                    let _ = w.set_focus();
                                }
                            }
                        })
                        .build(),
                )?;
            }

            start_playback_polling(app.handle().clone());

            let handle = app.handle().clone();
            app.listen("open-settings", move |_event| {
                if let Some(w) = handle.get_webview_window("settings") {
                    let _ = w.show();
                    let _ = w.set_focus();
                }
            });

            let handle = app.handle().clone();
            app.listen("settings-changed", move |_event| {
                playback::apply_settings_to_main_webview(&handle);
            });

            let handle = app.handle().clone();
            app.listen("playback-update", move |event: tauri::Event| {
                let payload = event.payload();
                if let Ok(state) = serde_json::from_str::<PlaybackState>(payload) {
                        if let (Some(discord_state), Some(settings_store)) = (
                            handle.try_state::<DiscordState>(),
                            handle.try_state::<SettingsStore>(),
                        ) {
                            let discord_val = settings_store.0.get("discord");
                            let (enabled, hide, client_id) = if let Some(serde_json::Value::Object(obj)) = discord_val {
                                (
                                    obj.get("enabled").and_then(|v| v.as_bool()).unwrap_or(true),
                                    obj.get("hide_listening").and_then(|v| v.as_bool()).unwrap_or(false),
                                    obj.get("client_id").and_then(|v| v.as_str()).map(String::from).unwrap_or_else(|| discord::DEFAULT_CLIENT_ID.to_string()),
                                )
                            } else {
                                (true, false, discord::DEFAULT_CLIENT_ID.to_string())
                            };
                            if enabled && !hide {
                                update_discord_presence(&discord_state, &client_id, &state);
                            }
                        }
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
