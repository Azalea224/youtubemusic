import { useEffect, useState, type ReactNode } from "react";
import type { AppSettings } from "./types";
import {
  GeneralSettings,
  AppearanceSettings,
  PlaybackSettings,
  DiscordSettings,
  PluginSettings,
  AdvancedSettings,
} from "./components/Settings";
import "./App.css";

const TABS = [
  { id: "general", label: "General" },
  { id: "appearance", label: "Appearance" },
  { id: "playback", label: "Playback" },
  { id: "discord", label: "Discord" },
  { id: "plugins", label: "Plugins" },
  { id: "advanced", label: "Advanced" },
] as const;

type TabId = (typeof TABS)[number]["id"];

interface TabPanelProps {
  settings: AppSettings;
  updateSettings: (updater: (s: AppSettings) => AppSettings) => void;
}

const TAB_PANELS: Record<TabId, (props: TabPanelProps) => ReactNode> = {
  general: ({ settings, updateSettings }) => (
    <GeneralSettings
      settings={settings.general}
      onChange={(g) => updateSettings((s) => ({ ...s, general: g }))}
    />
  ),
  appearance: ({ settings, updateSettings }) => (
    <AppearanceSettings
      settings={settings.appearance}
      onChange={(a) => updateSettings((s) => ({ ...s, appearance: a }))}
    />
  ),
  playback: ({ settings, updateSettings }) => (
    <PlaybackSettings
      settings={settings.playback}
      onChange={(p) => updateSettings((s) => ({ ...s, playback: p }))}
    />
  ),
  discord: ({ settings, updateSettings }) => (
    <DiscordSettings
      settings={settings.discord}
      onChange={(d) => updateSettings((s) => ({ ...s, discord: d }))}
    />
  ),
  plugins: ({ settings, updateSettings }) => (
    <PluginSettings
      settings={settings.plugins}
      onChange={(p) => updateSettings((s) => ({ ...s, plugins: p }))}
    />
  ),
  advanced: ({ settings, updateSettings }) => (
    <AdvancedSettings
      settings={settings.advanced}
      onChange={(a) => updateSettings((s) => ({ ...s, advanced: a }))}
    />
  ),
};

function App() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("general");

  useEffect(() => {
    window.electronAPI?.getSettings().then(setSettings).catch(console.error);
  }, []);

  const saveSettings = async (newSettings: AppSettings) => {
    try {
      await window.electronAPI?.setSettings(newSettings);
      setSettings(newSettings);
    } catch (e) {
      console.error("Failed to save settings:", e);
    }
  };

  const updateSettings = (updater: (s: AppSettings) => AppSettings) => {
    if (!settings) return;
    saveSettings(updater(settings));
  };

  if (!settings) {
    return (
      <div className="settings-loading">
        <p>Loading settings...</p>
      </div>
    );
  }

  const Panel = TAB_PANELS[activeTab];

  return (
    <div className="settings-app">
      <nav className="settings-sidebar">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            className={`settings-sidebar-item ${activeTab === id ? "active" : ""}`}
            onClick={() => setActiveTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>
      <main className="settings-content">
        <Panel settings={settings} updateSettings={updateSettings} />
      </main>
    </div>
  );
}

export default App;
