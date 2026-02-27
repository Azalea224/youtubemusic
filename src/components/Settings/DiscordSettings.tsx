import type { DiscordSettings as DiscordSettingsType } from "../../types";
import { SettingCheckbox } from "../SettingRow";

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
      <SettingCheckbox
        label="Show buttons in presence"
        checked={settings.show_buttons}
        onChange={(v) => onChange({ ...settings, show_buttons: v })}
      />
      {(settings.use_arrpc ?? false) && settings.show_buttons && (
        <p className="setting-hint">
          Buttons are sent but often don’t show in Vesktop/arRPC; they work with the official Discord app.
        </p>
      )}
      <SettingCheckbox
        label="Hide listening status (privacy)"
        checked={settings.hide_listening}
        onChange={(v) => onChange({ ...settings, hide_listening: v })}
      />
      <SettingCheckbox
        label="Use arRPC (Vencord / Discord Web)"
        checked={settings.use_arrpc ?? false}
        onChange={(v) => onChange({ ...settings, use_arrpc: v })}
      />
      {(settings.use_arrpc ?? false) && (
        <p className="setting-hint">
          Connects via <strong>IPC</strong> (discord-ipc-0) first, then WebSocket (6463) if needed. In Vesktop enable the <strong>WebRichPresence (arRPC)</strong> plugin (Vencord → Plugins). Close any manual <code>npx arrpc</code> and the official Discord app to avoid conflicts.
        </p>
      )}
    </section>
  );
}
