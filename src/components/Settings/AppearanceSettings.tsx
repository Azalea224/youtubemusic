import type { AppearanceSettings as AppearanceSettingsType } from "../../types";

interface Props {
  settings: AppearanceSettingsType;
  onChange: (s: AppearanceSettingsType) => void;
}

export function AppearanceSettings({ settings, onChange }: Props) {
  return (
    <section className="settings-section">
      <h2>Appearance</h2>
      <label className="setting-row">
        <span>Theme</span>
        <select
          value={settings.theme}
          onChange={(e) => onChange({ ...settings, theme: e.target.value })}
        >
          <option value="system">System</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </label>
      <label className="setting-row">
        <span>Accent color</span>
        <input
          type="color"
          value={settings.accent_color}
          onChange={(e) => onChange({ ...settings, accent_color: e.target.value })}
        />
        <input
          type="text"
          value={settings.accent_color}
          onChange={(e) => onChange({ ...settings, accent_color: e.target.value })}
          className="color-text"
        />
      </label>
      <label className="setting-row">
        <span>Font size</span>
        <select
          value={settings.font_size}
          onChange={(e) => onChange({ ...settings, font_size: e.target.value })}
        >
          <option value="small">Small</option>
          <option value="medium">Medium</option>
          <option value="large">Large</option>
        </select>
      </label>
      <label className="setting-row">
        <input
          type="checkbox"
          checked={settings.compact_mode}
          onChange={(e) => onChange({ ...settings, compact_mode: e.target.checked })}
        />
        <span>Compact mode</span>
      </label>
    </section>
  );
}
