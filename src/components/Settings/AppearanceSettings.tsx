import type { AppearanceSettings } from "../../types";
import { SettingCheckbox, SettingSelect, SettingColor } from "../SettingRow";
import { SettingsSection } from "./SettingsSection";

interface AppearanceSettingsProps {
  settings: AppearanceSettings;
  onChange: (s: AppearanceSettings) => void;
}

const THEME_OPTIONS = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

const FONT_SIZE_OPTIONS = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
];

export function AppearanceSettings({ settings, onChange }: AppearanceSettingsProps) {
  return (
    <SettingsSection title="Appearance">
      <SettingSelect
        label="Theme"
        value={settings.theme}
        options={THEME_OPTIONS}
        onChange={(v) => onChange({ ...settings, theme: v })}
      />
      <SettingColor
        label="Accent text colour"
        value={settings.accent_color}
        onChange={(v) => onChange({ ...settings, accent_color: v })}
      />
      <SettingSelect
        label="Font size"
        value={settings.font_size}
        options={FONT_SIZE_OPTIONS}
        onChange={(v) => onChange({ ...settings, font_size: v })}
      />
      <SettingCheckbox
        label="Compact mode"
        checked={settings.compact_mode}
        onChange={(v) => onChange({ ...settings, compact_mode: v })}
      />
    </SettingsSection>
  );
}
