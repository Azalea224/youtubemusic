import type { GeneralSettings } from "../../types";
import { SettingCheckbox } from "../SettingRow";
import { SettingsSection } from "./SettingsSection";

interface GeneralSettingsProps {
  settings: GeneralSettings;
  onChange: (s: GeneralSettings) => void;
}

export function GeneralSettings({ settings, onChange }: GeneralSettingsProps) {
  return (
    <SettingsSection title="General">
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
    </SettingsSection>
  );
}
