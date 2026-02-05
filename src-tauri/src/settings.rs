use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::{AppHandle, Emitter, State};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AppSettings {
    #[serde(default)]
    pub general: GeneralSettings,
    #[serde(default)]
    pub appearance: AppearanceSettings,
    #[serde(default)]
    pub playback: PlaybackSettings,
    #[serde(default)]
    pub discord: DiscordSettings,
    #[serde(default)]
    pub plugins: PluginSettings,
    #[serde(default)]
    pub advanced: AdvancedSettings,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeneralSettings {
    #[serde(default)]
    pub start_minimized: bool,
    #[serde(default = "default_true")]
    pub minimize_to_tray: bool,
    #[serde(default)]
    pub launch_at_login: bool,
    #[serde(default)]
    pub language: String,
}

impl Default for GeneralSettings {
    fn default() -> Self {
        Self {
            start_minimized: false,
            minimize_to_tray: true,
            launch_at_login: false,
            language: "en-GB".to_string(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppearanceSettings {
    #[serde(default)]
    pub theme: String,
    #[serde(default)]
    pub accent_color: String,
    #[serde(default)]
    pub font_size: String,
    #[serde(default)]
    pub compact_mode: bool,
}

impl Default for AppearanceSettings {
    fn default() -> Self {
        Self {
            theme: "system".to_string(),
            accent_color: "#ff0000".to_string(),
            font_size: "medium".to_string(),
            compact_mode: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlaybackSettings {
    #[serde(default)]
    pub default_quality: String,
    #[serde(default)]
    pub crossfade: bool,
    #[serde(default)]
    pub gapless: bool,
    #[serde(default)]
    pub repeat_default: String,
    #[serde(default)]
    pub shuffle_default: bool,
}

impl Default for PlaybackSettings {
    fn default() -> Self {
        Self {
            default_quality: "auto".to_string(),
            crossfade: false,
            gapless: true,
            repeat_default: "none".to_string(),
            shuffle_default: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiscordSettings {
    #[serde(default = "default_true")]
    pub enabled: bool,
    #[serde(default)]
    pub client_id: String,
    #[serde(default = "default_true")]
    pub show_buttons: bool,
    #[serde(default)]
    pub hide_listening: bool,
}

fn default_true() -> bool {
    true
}

impl Default for DiscordSettings {
    fn default() -> Self {
        Self {
            enabled: true,
            client_id: "1234567890123456789".to_string(),
            show_buttons: true,
            hide_listening: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginSettings {
    #[serde(default)]
    pub enabled_plugins: Vec<String>,
}

impl Default for PluginSettings {
    fn default() -> Self {
        Self {
            enabled_plugins: vec!["lyrics".to_string(), "fine-volume-control".to_string()],
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AdvancedSettings {
    #[serde(default)]
    pub data_directory: String,
    #[serde(default)]
    pub cache_size_mb: u32,
    #[serde(default)]
    pub debug_mode: bool,
    #[serde(default)]
    pub custom_css: String,
    #[serde(default)]
    pub custom_js: String,
}

impl Default for AdvancedSettings {
    fn default() -> Self {
        Self {
            data_directory: "".to_string(),
            cache_size_mb: 500,
            debug_mode: false,
            custom_css: "".to_string(),
            custom_js: "".to_string(),
        }
    }
}

pub struct SettingsStore(pub Arc<tauri_plugin_store::Store<tauri::Wry>>);

#[tauri::command]
pub async fn get_settings(store: State<'_, SettingsStore>) -> Result<AppSettings, String> {
    let s = &store.0;
    let mut general: GeneralSettings = s
        .get("general")
        .and_then(|v| serde_json::from_value(v.clone()).ok())
        .unwrap_or_default();
    general.language = "en-GB".to_string();
    let appearance = s
        .get("appearance")
        .and_then(|v| serde_json::from_value(v.clone()).ok())
        .unwrap_or_default();
    let playback = s
        .get("playback")
        .and_then(|v| serde_json::from_value(v.clone()).ok())
        .unwrap_or_default();
    let discord = s
        .get("discord")
        .and_then(|v| serde_json::from_value(v.clone()).ok())
        .unwrap_or_default();
    let plugins = s
        .get("plugins")
        .and_then(|v| serde_json::from_value(v.clone()).ok())
        .unwrap_or_default();
    let advanced = s
        .get("advanced")
        .and_then(|v| serde_json::from_value(v.clone()).ok())
        .unwrap_or_default();
    Ok(AppSettings {
        general,
        appearance,
        playback,
        discord,
        plugins,
        advanced,
    })
}

#[tauri::command]
pub async fn set_settings(
    app: AppHandle,
    store: State<'_, SettingsStore>,
    settings: AppSettings,
) -> Result<(), String> {
    let s = &store.0;
    s.set(
        "general".to_string(),
        serde_json::to_value(&settings.general).map_err(|e| e.to_string())?,
    );
    s.set(
        "appearance".to_string(),
        serde_json::to_value(&settings.appearance).map_err(|e| e.to_string())?,
    );
    s.set(
        "playback".to_string(),
        serde_json::to_value(&settings.playback).map_err(|e| e.to_string())?,
    );
    s.set(
        "discord".to_string(),
        serde_json::to_value(&settings.discord).map_err(|e| e.to_string())?,
    );
    s.set(
        "plugins".to_string(),
        serde_json::to_value(&settings.plugins).map_err(|e| e.to_string())?,
    );
    s.set(
        "advanced".to_string(),
        serde_json::to_value(&settings.advanced).map_err(|e| e.to_string())?,
    );
    s.save().map_err(|e| e.to_string())?;
    let _ = app.emit("settings-changed", ());
    Ok(())
}
