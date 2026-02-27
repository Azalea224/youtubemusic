export interface AppSettings {
  general: GeneralSettings;
  appearance: AppearanceSettings;
  discord: DiscordSettings;
  plugins: PluginSettings;
  advanced: AdvancedSettings;
}

export interface GeneralSettings {
  start_minimized: boolean;
  minimize_to_tray: boolean;
  launch_at_login: boolean;
}

export interface AppearanceSettings {
  theme: string;
  accent_color: string;
  font_size: string;
  compact_mode: boolean;
}

export interface DiscordSettings {
  enabled: boolean;
  show_buttons: boolean;
  hide_listening: boolean;
  /** Use arRPC WebSocket (for Vencord / Discord Web). When true, connects to arRPC instead of Discord IPC. */
  use_arrpc?: boolean;
}

export interface PluginSettings {
  enabled_plugins: string[];
}

export interface AdvancedSettings {
  custom_css: string;
  custom_js: string;
}

/** Plugin manifest (manifest.json). Used by settings UI and electron. */
export interface PluginManifest {
  name: string;
  version: string;
  description?: string;
  main: string;
  permissions: string[];
}
