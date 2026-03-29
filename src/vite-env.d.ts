/// <reference types="vite/client" />

interface ElectronAPI {
  getSettings: () => Promise<import("./types").AppSettings>;
  setSettings: (settings: import("./types").AppSettings) => Promise<void>;
  listPlugins: () => Promise<[string, import("./types").PluginManifest][]>;
  debugPlugins: () => Promise<Record<string, unknown>>;
  getEffectiveAccentColor?: () => Promise<string>;
  getKdeAccentAvailable?: () => Promise<boolean>;
  onKdeAccentChanged?: (callback: () => void) => () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
