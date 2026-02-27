import "@testing-library/jest-dom";
import type { AppSettings } from "../types";

/** Shared default settings for tests. Import in tests to avoid duplication. */
export const defaultSettings: AppSettings = {
  general: {
    start_minimized: false,
    minimize_to_tray: true,
    launch_at_login: false,
  },
  appearance: {
    theme: "system",
    accent_color: "#b0b0b0",
    font_size: "medium",
    compact_mode: false,
  },
  discord: {
    enabled: false,
    show_buttons: true,
    hide_listening: false,
    use_arrpc: false,
  },
  plugins: {
    enabled_plugins: [],
  },
  advanced: {
    custom_css: "",
    custom_js: "",
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
