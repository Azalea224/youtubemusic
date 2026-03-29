import type { DiscordSettings } from "../../types";
import { SettingCheckbox } from "../SettingRow";
import { SettingsSection } from "./SettingsSection";

interface DiscordSettingsProps {
  settings: DiscordSettings;
  onChange: (s: DiscordSettings) => void;
}

export function DiscordSettings({ settings, onChange }: DiscordSettingsProps) {
  return (
    <SettingsSection title="Discord Rich Presence">
      <SettingCheckbox
        label="Enable Discord Rich Presence"
        checked={settings.enabled}
        onChange={(v) => onChange({ ...settings, enabled: v })}
      />
      <p className="setting-hint">
        When enabled, your Discord profile can show the current track (respecting the privacy option below).
      </p>
      <SettingCheckbox
        label="Show buttons in presence"
        checked={settings.showButtons}
        onChange={(v) => onChange({ ...settings, showButtons: v })}
      />
      {(settings.useArrpc ?? false) && settings.showButtons && (
        <p className="setting-hint">
          Buttons are sent but often don’t show in Vesktop/arRPC; they work with the official Discord app.
        </p>
      )}
      <SettingCheckbox
        label="Hide listening status (privacy)"
        checked={settings.hideListening}
        onChange={(v) => onChange({ ...settings, hideListening: v })}
      />
      <SettingCheckbox
        label="Use arRPC (Vencord / Discord Web)"
        checked={settings.useArrpc ?? false}
        onChange={(v) => onChange({ ...settings, useArrpc: v })}
      />
      {(settings.useArrpc ?? false) && (
        <p className="setting-hint">
          Connects via <strong>IPC</strong> (discord-ipc-0) first, then WebSocket (6463) if needed. In Vesktop enable the <strong>WebRichPresence (arRPC)</strong> plugin (Vencord → Plugins). Close any manual <code>npx arrpc</code> and the official Discord app to avoid conflicts.
        </p>
      )}
    </SettingsSection>
  );
}
