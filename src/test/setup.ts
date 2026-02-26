import "@testing-library/jest-dom";
import type { AppSettings } from "../types";

const defaultSettings: AppSettings = {
  general: {
    start_minimized: false,
    minimize_to_tray: true,
    launch_at_login: false,
    language: "en-GB",
  },
  appearance: {
    theme: "system",
    accent_color: "#1a73e8",
    font_size: "medium",
    compact_mode: false,
  },
  playback: {
    default_quality: "auto",
    crossfade: false,
    gapless: true,
    repeat_default: "none",
    shuffle_default: false,
  },
  discord: {
    enabled: false,
    client_id: "",
    show_buttons: true,
    hide_listening: false,
  },
  plugins: {
    enabled_plugins: [],
  },
  advanced: {
    data_directory: "",
    cache_size_mb: 500,
    debug_mode: false,
    custom_css: "",
    custom_js: "",
  },
};

let lastSetSettings: AppSettings | null = null;

(window as Window & { __electronAPIMock?: { getLastSetSettings: () => AppSettings | null } }).__electronAPIMock = {
  getLastSetSettings: () => lastSetSettings,
};

Object.defineProperty(window, "electronAPI", {
  value: {
    getSettings: () => Promise.resolve(defaultSettings),
    setSettings: (settings: AppSettings) => {
      lastSetSettings = settings;
      return Promise.resolve();
    },
    listPlugins: () => Promise.resolve([]),
    debugPlugins: () => Promise.resolve({}),
  },
  writable: true,
  configurable: true,
});
