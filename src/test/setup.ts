import "@testing-library/jest-dom";
import type { AppSettings } from "../types";

/** Shared default settings for tests. Import in tests to avoid duplication. */
export const defaultSettings: AppSettings = {
  general: {
    startMinimized: false,
    minimizeToTray: true,
    launchAtLogin: false,
  },
  appearance: {
    theme: "system",
    accentColor: "#b0b0b0",
    accentSource: "custom",
    fontSize: "medium",
    compactMode: false,
  },
  discord: {
    enabled: false,
    showButtons: true,
    hideListening: false,
    useArrpc: false,
  },
  plugins: {
    enabledPlugins: [],
  },
  advanced: {
    customCss: "",
    customJs: "",
  },
};

let lastSetSettings: AppSettings | null = null;

declare global {
  interface Window {
    __electronAPIMock?: { getLastSetSettings: () => AppSettings | null; resetLastSetSettings: () => void };
  }
}

const createElectronAPI = (settings: AppSettings = defaultSettings) => ({
  getSettings: () => Promise.resolve(settings),
  setSettings: (s: AppSettings) => {
    lastSetSettings = s;
    return Promise.resolve();
  },
  listPlugins: () => Promise.resolve([]),
  debugPlugins: () => Promise.resolve({}),
  getEffectiveAccentColor: () => Promise.resolve(settings.appearance.accentColor),
  getKdeAccentAvailable: () => Promise.resolve(false),
  onKdeAccentChanged: () => () => {},
});

window.__electronAPIMock = {
  getLastSetSettings: () => lastSetSettings,
  resetLastSetSettings: () => {
    lastSetSettings = null;
  },
};

Object.defineProperty(window, "electronAPI", {
  value: createElectronAPI(),
  writable: true,
  configurable: true,
});

/** Restore the default electronAPI mock. Use in beforeEach when tests override it. */
export function resetElectronAPIMock(settings: AppSettings = defaultSettings) {
  (window as Window & { electronAPI: typeof window.electronAPI }).electronAPI = createElectronAPI(settings);
}
