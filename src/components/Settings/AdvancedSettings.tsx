import type { AdvancedSettings as AdvancedSettingsType } from "../../types";

interface Props {
  settings: AdvancedSettingsType;
  onChange: (s: AdvancedSettingsType) => void;
}

export function AdvancedSettings({ settings, onChange }: Props) {
  return (
    <section className="settings-section">
      <h2>Advanced</h2>
      <label className="setting-row">
        <span>Data directory</span>
        <input
          type="text"
          value={settings.data_directory}
          onChange={(e) => onChange({ ...settings, data_directory: e.target.value })}
          placeholder="Default: app data dir"
        />
      </label>
      <label className="setting-row">
        <span>Cache size (MB)</span>
        <input
          type="number"
          min={100}
          max={2000}
          value={settings.cache_size_mb}
          onChange={(e) =>
            onChange({ ...settings, cache_size_mb: parseInt(e.target.value) || 500 })
          }
        />
      </label>
      <label className="setting-row">
        <input
          type="checkbox"
          checked={settings.debug_mode}
          onChange={(e) => onChange({ ...settings, debug_mode: e.target.checked })}
        />
        <span>Debug mode</span>
        <span className="restart-hint">(Restart required)</span>
      </label>
      <label className="setting-row full-width">
        <span>Custom CSS injection</span>
        <textarea
          value={settings.custom_css}
          onChange={(e) => onChange({ ...settings, custom_css: e.target.value })}
          placeholder="Optional CSS to inject into YouTube Music"
          rows={4}
        />
      </label>
      <label className="setting-row full-width">
        <span>Custom JS injection</span>
        <textarea
          value={settings.custom_js}
          onChange={(e) => onChange({ ...settings, custom_js: e.target.value })}
          placeholder="Optional JavaScript to inject (use with caution)"
          rows={4}
        />
      </label>
    </section>
  );
}
