import type { PlaybackSettings as PlaybackSettingsType } from "../../types";
import { SettingCheckbox, SettingSelect } from "../SettingRow";

interface Props {
  settings: PlaybackSettingsType;
  onChange: (s: PlaybackSettingsType) => void;
}

const QUALITY_OPTIONS = [
  { value: "auto", label: "Auto" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

const REPEAT_OPTIONS = [
  { value: "none", label: "None" },
  { value: "one", label: "One" },
  { value: "all", label: "All" },
];

export function PlaybackSettings({ settings, onChange }: Props) {
  return (
    <section className="settings-section">
      <h2>Playback</h2>
      <SettingSelect
        label="Default quality"
        value={settings.default_quality}
        options={QUALITY_OPTIONS}
        onChange={(v) => onChange({ ...settings, default_quality: v })}
      />
      <SettingCheckbox
        label="Crossfade between tracks"
        checked={settings.crossfade}
        onChange={(v) => onChange({ ...settings, crossfade: v })}
      />
      <SettingCheckbox
        label="Gapless playback"
        checked={settings.gapless}
        onChange={(v) => onChange({ ...settings, gapless: v })}
      />
      <SettingSelect
        label="Repeat default"
        value={settings.repeat_default}
        options={REPEAT_OPTIONS}
        onChange={(v) => onChange({ ...settings, repeat_default: v })}
      />
      <SettingCheckbox
        label="Shuffle by default"
        checked={settings.shuffle_default}
        onChange={(v) => onChange({ ...settings, shuffle_default: v })}
      />
    </section>
  );
}
