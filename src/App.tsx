import { useEffect, useState } from "react";
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

function App() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]["id"]>("general");

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
    const next = updater(settings);
    saveSettings(next);
  };

  if (!settings) {
    return (
      <div className="settings-loading" style={{ background: "#0a0a0a", color: "#fff" }}>
        <p>Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="settings-app" style={{ background: "#0a0a0a" }}>
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
        {activeTab === "general" && (
          <GeneralSettings
            settings={settings.general}
            onChange={(g) => updateSettings((s) => ({ ...s, general: g }))}
          />
        )}
        {activeTab === "appearance" && (
          <AppearanceSettings
            settings={settings.appearance}
            onChange={(a) => updateSettings((s) => ({ ...s, appearance: a }))}
          />
        )}
        {activeTab === "playback" && (
          <PlaybackSettings
            settings={settings.playback}
            onChange={(p) => updateSettings((s) => ({ ...s, playback: p }))}
          />
        )}
        {activeTab === "discord" && (
          <DiscordSettings
            settings={settings.discord}
            onChange={(d) => updateSettings((s) => ({ ...s, discord: d }))}
          />
        )}
        {activeTab === "plugins" && (
          <PluginSettings
            settings={settings.plugins}
            onChange={(p) => updateSettings((s) => ({ ...s, plugins: p }))}
          />
        )}
        {activeTab === "advanced" && (
          <AdvancedSettings
            settings={settings.advanced}
            onChange={(a) => updateSettings((s) => ({ ...s, advanced: a }))}
          />
        )}
      </main>
    </div>
  );
}

export default App;
