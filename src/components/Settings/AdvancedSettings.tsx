import type { AdvancedSettings } from "../../types";
import { SettingTextarea } from "../SettingRow";
import { SettingsSection } from "./SettingsSection";

interface AdvancedSettingsProps {
  settings: AdvancedSettings;
  onChange: (s: AdvancedSettings) => void;
}

export function AdvancedSettings({ settings, onChange }: AdvancedSettingsProps) {
  return (
    <SettingsSection title="Advanced">
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
    </SettingsSection>
  );
}
