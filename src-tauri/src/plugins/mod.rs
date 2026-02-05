use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use tauri::Manager;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginManifest {
    pub name: String,
    pub version: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub main: String,
    #[serde(default)]
    pub permissions: Vec<String>,
}

const DEFAULT_PLUGINS: &[&str] = &["lyrics", "fine-volume-control"];

/// Copy default plugins from bundled resources (or dev path) to app data if not present.
pub fn ensure_default_plugins(app: &tauri::AppHandle) {
    let app_data_dir: PathBuf = match app.path().app_data_dir() {
        Ok(p) => p,
        Err(_) => return,
    };
    let plugins_dest = app_data_dir.join("plugins");
    let _ = std::fs::create_dir_all(&plugins_dest);

    let source_base = get_plugins_source_dir(app);
    if source_base.is_none() {
        return;
    }
    let source_base = source_base.unwrap();

    for name in DEFAULT_PLUGINS {
        let src = source_base.join(name);
        let dest = plugins_dest.join(name);
        if src.is_dir() && !dest.exists() {
            if let Err(e) = copy_dir_all(&src, &dest) {
                eprintln!("Failed to copy plugin {}: {}", name, e);
            }
        }
    }
}

fn copy_dir_all(src: &Path, dst: &Path) -> std::io::Result<()> {
    std::fs::create_dir_all(dst)?;
    for entry in std::fs::read_dir(src)? {
        let entry = entry?;
        let ty = entry.file_type()?;
        let dst_path = dst.join(entry.file_name());
        if ty.is_dir() {
            copy_dir_all(&entry.path(), &dst_path)?;
        } else {
            std::fs::copy(entry.path(), dst_path)?;
        }
    }
    Ok(())
}

fn get_plugins_source_dir(app: &tauri::AppHandle) -> Option<PathBuf> {
    use tauri::path::BaseDirectory;
    let resolved = app.path().resolve("../plugins", BaseDirectory::Resource).ok()?;
    if resolved.exists() {
        return Some(resolved);
    }
    let dev_path = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../plugins");
    if dev_path.exists() {
        return Some(dev_path.canonicalize().unwrap_or(dev_path));
    }
    None
}

// innerHTML triggers Trusted Types console errors but is the only approach that doesn't crash the webview
// (data URL and createElementNS both cause immediate webview crash)
const SETTINGS_BUTTON_SCRIPT: &str = r#"
(function(){
  if (document.getElementById('ytm-settings-btn')) return;
  if (!document.body) return;
  var btn = document.createElement('button');
  btn.id = 'ytm-settings-btn';
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Settings');
  btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';
  btn.style.cssText = 'position:fixed!important;top:12px!important;right:12px!important;z-index:2147483647!important;width:44px!important;height:44px!important;padding:0!important;border:1px solid rgba(255,255,255,0.3)!important;border-radius:50%!important;background:#3f3f3f!important;color:#fff!important;cursor:pointer!important;display:flex!important;align-items:center!important;justify-content:center!important;opacity:0.95!important;transition:opacity 0.2s,background 0.2s!important;pointer-events:auto!important;box-shadow:0 2px 8px rgba(0,0,0,0.3)!important;';
  btn.onmouseover = function(){ btn.style.opacity = '1'; btn.style.background = '#505050'; };
  btn.onmouseout = function(){ btn.style.opacity = '0.95'; btn.style.background = '#3f3f3f'; };
  btn.onclick = function(e){ e.preventDefault(); e.stopPropagation(); var t=window.__TAURI_INTERNALS__; if(t&&t.event){ t.event.emit('open-settings'); }else if(t&&t.invoke){ t.invoke('open_settings'); } };
  document.body.appendChild(btn);
})();
"#;

/// Returns the settings button injection script.
pub fn get_settings_button_script() -> &'static str {
    SETTINGS_BUTTON_SCRIPT
}

/// Build concatenated JS for all enabled plugins to inject into YTM webview.
pub fn get_plugin_injection_script(
    app_data_dir: &PathBuf,
    enabled_plugins: &[String],
) -> String {
    let plugins_dir = app_data_dir.join("plugins");
    let mut scripts = vec![SETTINGS_BUTTON_SCRIPT.to_string()];
    if !plugins_dir.exists() || enabled_plugins.is_empty() {
        return scripts.join("\n;\n");
    }
    for id in enabled_plugins {
        let plugin_dir = plugins_dir.join(id);
        let manifest_path = plugin_dir.join("manifest.json");
        if !manifest_path.exists() {
            continue;
        }
        let manifest: PluginManifest = match std::fs::read_to_string(&manifest_path)
            .ok()
            .and_then(|s| serde_json::from_str(&s).ok())
        {
            Some(m) => m,
            None => continue,
        };
        let main_file = if manifest.main.is_empty() {
            "index.js".to_string()
        } else {
            manifest.main
        };
        let script_path = plugin_dir.join(&main_file);
        if let Ok(content) = std::fs::read_to_string(&script_path) {
            scripts.push(content);
        }
    }
    scripts.join("\n;\n")
}

pub fn scan_plugins_dir(app_data_dir: &PathBuf) -> Vec<(String, PluginManifest)> {
    let plugins_dir = app_data_dir.join("plugins");
    let _ = std::fs::create_dir_all(&plugins_dir);
    let mut result = Vec::new();
    if !plugins_dir.exists() {
        return result;
    }
    if let Ok(entries) = std::fs::read_dir(&plugins_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                let manifest_path = path.join("manifest.json");
                if manifest_path.exists() {
                    if let Ok(content) = std::fs::read_to_string(&manifest_path) {
                        if let Ok(manifest) = serde_json::from_str::<PluginManifest>(&content) {
                            result.push((path.file_name().unwrap().to_string_lossy().to_string(), manifest));
                        }
                    }
                }
            }
        }
    }
    result
}
