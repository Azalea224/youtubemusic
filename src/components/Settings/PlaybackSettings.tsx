import type { PlaybackSettings as PlaybackSettingsType } from "../../types";

interface Props {
  settings: PlaybackSettingsType;
  onChange: (s: PlaybackSettingsType) => void;
}

export function PlaybackSettings({ settings, onChange }: Props) {
  return (
    <section className="settings-section">
      <h2>Playback</h2>
      <label className="setting-row">
        <span>Default quality</span>
        <select
          value={settings.default_quality}
          onChange={(e) => onChange({ ...settings, default_quality: e.target.value })}
        >
          <option value="auto">Auto</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </label>
      <label className="setting-row">
        <input
          type="checkbox"
          checked={settings.crossfade}
          onChange={(e) => onChange({ ...settings, crossfade: e.target.checked })}
        />
        <span>Crossfade between tracks</span>
      </label>
      <label className="setting-row">
        <input
          type="checkbox"
          checked={settings.gapless}
          onChange={(e) => onChange({ ...settings, gapless: e.target.checked })}
        />
        <span>Gapless playback</span>
      </label>
      <label className="setting-row">
        <span>Repeat default</span>
        <select
          value={settings.repeat_default}
          onChange={(e) => onChange({ ...settings, repeat_default: e.target.value })}
        >
          <option value="none">None</option>
          <option value="one">One</option>
          <option value="all">All</option>
        </select>
      </label>
      <label className="setting-row">
        <input
          type="checkbox"
          checked={settings.shuffle_default}
          onChange={(e) => onChange({ ...settings, shuffle_default: e.target.checked })}
        />
        <span>Shuffle by default</span>
      </label>
    </section>
  );
}
