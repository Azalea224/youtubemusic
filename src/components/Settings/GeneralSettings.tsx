import type { GeneralSettings as GeneralSettingsType } from "../../types";

interface Props {
  settings: GeneralSettingsType;
  onChange: (s: GeneralSettingsType) => void;
}

export function GeneralSettings({ settings, onChange }: Props) {
  return (
    <section className="settings-section">
      <h2>General</h2>
      <p className="setting-hint">
        <strong>Tip:</strong> Press <kbd>Ctrl+Shift+S</kbd> (<kbd>Cmd+Shift+S</kbd> on Mac) to open Settings, or use <strong>File → Settings</strong> in the menu bar.
      </p>
      <label className="setting-row">
        <input
          type="checkbox"
          checked={settings.start_minimized}
          onChange={(e) => onChange({ ...settings, start_minimized: e.target.checked })}
        />
        <span>Start minimized</span>
      </label>
      <label className="setting-row">
        <input
          type="checkbox"
          checked={settings.minimize_to_tray}
          onChange={(e) => onChange({ ...settings, minimize_to_tray: e.target.checked })}
        />
        <span>Minimize to tray</span>
      </label>
      <label className="setting-row">
        <input
          type="checkbox"
          checked={settings.launch_at_login}
          onChange={(e) => onChange({ ...settings, launch_at_login: e.target.checked })}
        />
        <span>Launch at login</span>
        <span className="restart-hint">(Restart required)</span>
      </label>
    </section>
  );
}
