import type { DiscordSettings as DiscordSettingsType } from "../../types";
import { SettingCheckbox, SettingText } from "../SettingRow";

interface Props {
  settings: DiscordSettingsType;
  onChange: (s: DiscordSettingsType) => void;
}

export function DiscordSettings({ settings, onChange }: Props) {
  return (
    <section className="settings-section">
      <h2>Discord Rich Presence</h2>
      <SettingCheckbox
        label="Enable Discord Rich Presence"
        checked={settings.enabled}
        onChange={(v) => onChange({ ...settings, enabled: v })}
      />
      <p className="setting-hint">
        Shows what you're listening to on Discord.
      </p>
      <SettingText
        label="Client ID (optional)"
        value={settings.client_id}
        onChange={(v) => onChange({ ...settings, client_id: v })}
        placeholder="Add your Discord App ID to enable"
      />
      <p className="setting-hint">
        Create an app at{" "}
        <a href="https://discord.com/developers/applications" target="_blank" rel="noreferrer">
          Discord Developer Portal
        </a>{" "}
        and paste the Application ID to enable Rich Presence.
      </p>
      <SettingCheckbox
        label="Show buttons in presence"
        checked={settings.show_buttons}
        onChange={(v) => onChange({ ...settings, show_buttons: v })}
      />
      <SettingCheckbox
        label="Hide listening status (privacy)"
        checked={settings.hide_listening}
        onChange={(v) => onChange({ ...settings, hide_listening: v })}
      />
    </section>
  );
}
