export interface AppSettings {
  general: GeneralSettings;
  appearance: AppearanceSettings;
  playback: PlaybackSettings;
  discord: DiscordSettings;
  plugins: PluginSettings;
  advanced: AdvancedSettings;
}

export interface GeneralSettings {
  start_minimized: boolean;
  minimize_to_tray: boolean;
  launch_at_login: boolean;
  language: string;
}

export interface AppearanceSettings {
  theme: string;
  accent_color: string;
  font_size: string;
  compact_mode: boolean;
}

export interface PlaybackSettings {
  default_quality: string;
  crossfade: boolean;
  gapless: boolean;
  repeat_default: string;
  shuffle_default: boolean;
}

export interface DiscordSettings {
  enabled: boolean;
  client_id: string;
  show_buttons: boolean;
  hide_listening: boolean;
}

export interface PluginSettings {
  enabled_plugins: string[];
}

export interface AdvancedSettings {
  data_directory: string;
  cache_size_mb: number;
  debug_mode: boolean;
  custom_css: string;
  custom_js: string;
}
