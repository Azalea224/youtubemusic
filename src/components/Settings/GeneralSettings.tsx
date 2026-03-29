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
        <strong>Shortcut:</strong> <kbd>Ctrl+Shift+S</kbd> (or <kbd>Cmd+Shift+S</kbd> on macOS) opens this window from the player.
      </p>
      <SettingCheckbox
        label="Start minimized"
        checked={settings.startMinimized}
        onChange={(v) => onChange({ ...settings, startMinimized: v })}
      />
      <SettingCheckbox
        label="Minimize to tray"
        checked={settings.minimizeToTray}
        onChange={(v) => onChange({ ...settings, minimizeToTray: v })}
      />
      <SettingCheckbox
        label="Launch at login"
        checked={settings.launchAtLogin}
        onChange={(v) => onChange({ ...settings, launchAtLogin: v })}
        hint="(Restart required)"
      />
    </SettingsSection>
  );
}
