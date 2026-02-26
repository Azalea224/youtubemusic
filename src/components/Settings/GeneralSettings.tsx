import type { GeneralSettings as GeneralSettingsType } from "../../types";
import { SettingCheckbox } from "../SettingRow";

interface Props {
  settings: GeneralSettingsType;
  onChange: (s: GeneralSettingsType) => void;
}

export function GeneralSettings({ settings, onChange }: Props) {
  return (
    <section className="settings-section">
      <h2>General</h2>
      <p className="setting-hint">
        <strong>Tip:</strong> Press <kbd>Ctrl+Shift+S</kbd> (<kbd>Cmd+Shift+S</kbd> on Mac) to open Settings.
      </p>
      <SettingCheckbox
        label="Start minimized"
        checked={settings.start_minimized}
        onChange={(v) => onChange({ ...settings, start_minimized: v })}
      />
      <SettingCheckbox
        label="Minimize to tray"
        checked={settings.minimize_to_tray}
        onChange={(v) => onChange({ ...settings, minimize_to_tray: v })}
      />
      <SettingCheckbox
        label="Launch at login"
        checked={settings.launch_at_login}
        onChange={(v) => onChange({ ...settings, launch_at_login: v })}
        hint="(Restart required)"
      />
    </section>
  );
}
