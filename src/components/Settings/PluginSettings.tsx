import { useEffect, useState } from "react";
import type { PluginManifest, PluginSettings } from "../../types";
import { SettingsSection } from "./SettingsSection";

interface PluginSettingsProps {
  settings: PluginSettings;
  onChange: (s: PluginSettings) => void;
}

export function PluginSettings({ settings, onChange }: PluginSettingsProps) {
  const [installedPlugins, setInstalledPlugins] = useState<[string, PluginManifest][]>([]);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

  useEffect(() => {
    window.electronAPI?.listPlugins()
      .then(setInstalledPlugins)
      .catch(() => setInstalledPlugins([]));
  }, []);

  const togglePlugin = (id: string, enabled: boolean) => {
    const next = enabled
      ? [...settings.enabledPlugins, id]
      : settings.enabledPlugins.filter((p) => p !== id);
    onChange({ ...settings, enabledPlugins: next });
  };

  const isEnabled = (id: string) => settings.enabledPlugins.includes(id);

  return (
    <SettingsSection title="Plugins">
      <p className="setting-hint">
        Plugins add features on top of YouTube Music. Put each plugin in a folder with a{" "}
        <code>manifest.json</code> inside your app data <strong>plugins</strong> directory (use Debug below if you are unsure where that is).
      </p>
      <div className="setting-row">
        <button
          type="button"
          className="plugin-debug-btn"
          onClick={async () => {
            try {
              const info = await window.electronAPI?.debugPlugins();
              setDebugInfo(JSON.stringify(info, null, 2));
            } catch (e) {
              setDebugInfo(String(e));
            }
          }}
        >
          Debug plugin status
        </button>
      </div>
      {debugInfo && (
        <pre className="plugin-debug-output">{debugInfo}</pre>
      )}
      {installedPlugins.length === 0 ? (
        <p className="no-plugins">No plugins found. Add plugins to the plugins directory.</p>
      ) : (
        <ul className="plugin-list">
          {installedPlugins.map(([id, manifest]) => (
            <li key={id} className="plugin-item">
              <div className="plugin-info">
                <span className="plugin-name">{manifest.name || id}</span>
                <span className="plugin-version">v{manifest.version}</span>
                {manifest.description && (
                  <p className="plugin-usage">{manifest.description}</p>
                )}
              </div>
              <label className="plugin-toggle">
                <input
                  type="checkbox"
                  checked={isEnabled(id)}
                  onChange={(e) => togglePlugin(id, e.target.checked)}
                />
                Enabled
              </label>
            </li>
          ))}
        </ul>
      )}
    </SettingsSection>
  );
}
