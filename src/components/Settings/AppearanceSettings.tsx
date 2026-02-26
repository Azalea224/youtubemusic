import type { AppearanceSettings as AppearanceSettingsType } from "../../types";
import { SettingCheckbox, SettingSelect, SettingColor } from "../SettingRow";

interface Props {
  settings: AppearanceSettingsType;
  onChange: (s: AppearanceSettingsType) => void;
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

export function AppearanceSettings({ settings, onChange }: Props) {
  return (
    <section className="settings-section">
      <h2>Appearance</h2>
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
    </section>
  );
}
