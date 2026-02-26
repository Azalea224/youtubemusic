import type { AdvancedSettings as AdvancedSettingsType } from "../../types";
import {
  SettingCheckbox,
  SettingText,
  SettingNumber,
  SettingTextarea,
} from "../SettingRow";

interface Props {
  settings: AdvancedSettingsType;
  onChange: (s: AdvancedSettingsType) => void;
}

export function AdvancedSettings({ settings, onChange }: Props) {
  return (
    <section className="settings-section">
      <h2>Advanced</h2>
      <SettingText
        label="Data directory"
        value={settings.data_directory}
        onChange={(v) => onChange({ ...settings, data_directory: v })}
        placeholder="Default: app data dir"
      />
      <SettingNumber
        label="Cache size (MB)"
        value={settings.cache_size_mb}
        min={100}
        max={2000}
        onChange={(v) => onChange({ ...settings, cache_size_mb: v || 500 })}
      />
      <SettingCheckbox
        label="Debug mode"
        checked={settings.debug_mode}
        onChange={(v) => onChange({ ...settings, debug_mode: v })}
        hint="(Restart required)"
      />
      <SettingTextarea
        label="Custom CSS injection"
        value={settings.custom_css}
        onChange={(v) => onChange({ ...settings, custom_css: v })}
        placeholder="Optional CSS to inject into YouTube Music"
        rows={4}
      />
      <SettingTextarea
        label="Custom JS injection"
        value={settings.custom_js}
        onChange={(v) => onChange({ ...settings, custom_js: v })}
        placeholder="Optional JavaScript to inject (use with caution)"
        rows={4}
      />
    </section>
  );
}
