import type { AdvancedSettings as AdvancedSettingsType } from "../../types";
import { SettingTextarea } from "../SettingRow";

interface Props {
  settings: AdvancedSettingsType;
  onChange: (s: AdvancedSettingsType) => void;
}

export function AdvancedSettings({ settings, onChange }: Props) {
  return (
    <section className="settings-section">
      <h2>Advanced</h2>
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
