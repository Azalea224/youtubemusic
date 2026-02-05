import type { DiscordSettings as DiscordSettingsType } from "../../types";

interface Props {
  settings: DiscordSettingsType;
  onChange: (s: DiscordSettingsType) => void;
}

export function DiscordSettings({ settings, onChange }: Props) {
  return (
    <section className="settings-section">
      <h2>Discord Rich Presence</h2>
      <label className="setting-row">
        <input
          type="checkbox"
          checked={settings.enabled}
          onChange={(e) => onChange({ ...settings, enabled: e.target.checked })}
        />
        <span>Enable Discord Rich Presence</span>
      </label>
      <p className="setting-hint">
        Shows what you're listening to on Discord.
      </p>
      <label className="setting-row">
        <span>Client ID (optional)</span>
        <input
          type="text"
          value={settings.client_id}
          onChange={(e) => onChange({ ...settings, client_id: e.target.value })}
          placeholder="Add your Discord App ID to enable"
        />
      </label>
      <p className="setting-hint">
        Create an app at{" "}
        <a href="https://discord.com/developers/applications" target="_blank" rel="noreferrer">
          Discord Developer Portal
        </a>{" "}
        and paste the Application ID to enable Rich Presence.
      </p>
      <label className="setting-row">
        <input
          type="checkbox"
          checked={settings.show_buttons}
          onChange={(e) => onChange({ ...settings, show_buttons: e.target.checked })}
        />
        <span>Show buttons in presence</span>
      </label>
      <label className="setting-row">
        <input
          type="checkbox"
          checked={settings.hide_listening}
          onChange={(e) => onChange({ ...settings, hide_listening: e.target.checked })}
        />
        <span>Hide listening status (privacy)</span>
      </label>
    </section>
  );
}
