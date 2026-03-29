/** Renderer-facing settings (camelCase). Persisted JSON on disk remains snake_case via preload bridge. */
export interface AppSettings {
  general: GeneralSettings;
  appearance: AppearanceSettings;
  discord: DiscordSettings;
  plugins: PluginSettings;
  advanced: AdvancedSettings;
}

export interface GeneralSettings {
  startMinimized: boolean;
  minimizeToTray: boolean;
  launchAtLogin: boolean;
}

export interface AppearanceSettings {
  theme: string;
  /** Used when accentSource is custom, or as fallback when KDE colour cannot be read. */
  accentColor: string;
  /** "custom" uses accentColor; "kde" reads ~/.config/kdeglobals (Plasma) on Linux. */
  accentSource: "custom" | "kde";
  fontSize: string;
  compactMode: boolean;
}

export interface DiscordSettings {
  enabled: boolean;
  showButtons: boolean;
  hideListening: boolean;
  /** Use arRPC WebSocket (for Vencord / Discord Web). When true, connects to arRPC instead of Discord IPC. */
  useArrpc?: boolean;
}

export interface PluginSettings {
  enabledPlugins: string[];
}

export interface AdvancedSettings {
  customCss: string;
  customJs: string;
}

/** Plugin manifest (manifest.json). Used by settings UI and electron. */
export interface PluginManifest {
  name: string;
  version: string;
  description?: string;
  main: string;
  permissions: string[];
}
