import { useEffect, useState } from "react";
import type { PluginSettings as PluginSettingsType } from "../../types";

interface PluginManifest {
  name: string;
  version: string;
  description?: string;
  main: string;
  permissions: string[];
}

interface Props {
  settings: PluginSettingsType;
  onChange: (s: PluginSettingsType) => void;
}

export function PluginSettings({ settings, onChange }: Props) {
  const [installedPlugins, setInstalledPlugins] = useState<[string, PluginManifest][]>([]);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

  useEffect(() => {
    window.electronAPI?.listPlugins()
      .then(setInstalledPlugins)
      .catch(() => setInstalledPlugins([]));
  }, []);

  const togglePlugin = (id: string, enabled: boolean) => {
    const next = enabled
      ? [...settings.enabled_plugins, id]
      : settings.enabled_plugins.filter((p) => p !== id);
    onChange({ ...settings, enabled_plugins: next });
  };

  const isEnabled = (id: string) => settings.enabled_plugins.includes(id);

  return (
    <section className="settings-section">
      <h2>Plugins</h2>
      <p className="setting-hint">
        Plugins extend the app with custom functionality. Place plugin folders (with manifest.json)
        in your app data plugins directory.
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
    </section>
  );
}
