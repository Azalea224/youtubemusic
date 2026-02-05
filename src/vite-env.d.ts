/// <reference types="vite/client" />

interface ElectronAPI {
  getSettings: () => Promise<import("./types").AppSettings>;
  setSettings: (settings: import("./types").AppSettings) => Promise<void>;
  listPlugins: () => Promise<[string, { name: string; version: string; description?: string; main: string; permissions: string[] }][]>;
  debugPlugins: () => Promise<Record<string, unknown>>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
