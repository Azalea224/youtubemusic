import { useEffect, useState } from "react";
import type { AppearanceSettings } from "../../types";
import { SettingCheckbox, SettingSelect, SettingColor } from "../SettingRow";
import { SettingsSection } from "./SettingsSection";

interface AppearanceSettingsProps {
  settings: AppearanceSettings;
  onChange: (s: AppearanceSettings) => void;
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

export function AppearanceSettings({ settings, onChange }: AppearanceSettingsProps) {
  const [kdeAvailable, setKdeAvailable] = useState(false);
  const [effectiveAccent, setEffectiveAccent] = useState(settings.accentColor);

  const accentSource = settings.accentSource || "custom";

  useEffect(() => {
    window.electronAPI?.getKdeAccentAvailable?.().then(setKdeAvailable).catch(() => setKdeAvailable(false));
  }, []);

  useEffect(() => {
    if (accentSource !== "kde") {
      setEffectiveAccent(settings.accentColor);
      return;
    }
    window.electronAPI?.getEffectiveAccentColor?.().then(setEffectiveAccent).catch(() => {
      setEffectiveAccent(settings.accentColor);
    });
  }, [accentSource, settings.accentColor]);

  useEffect(() => {
    if (accentSource !== "kde") return;
    const unsub = window.electronAPI?.onKdeAccentChanged?.(() => {
      window.electronAPI?.getEffectiveAccentColor?.().then(setEffectiveAccent).catch(() => {});
    });
    return () => {
      unsub?.();
    };
  }, [accentSource]);

  const showKdeOption = kdeAvailable || accentSource === "kde";
  const accentSourceOptions = showKdeOption
    ? [
        { value: "custom", label: "Custom" },
        { value: "kde", label: "KDE Plasma (~/.config/kdeglobals)" },
      ]
    : [{ value: "custom", label: "Custom" }];

  return (
    <SettingsSection title="Appearance">
      <SettingSelect
        label="Theme"
        value={settings.theme}
        options={THEME_OPTIONS}
        onChange={(v) => onChange({ ...settings, theme: v })}
      />
      <SettingSelect
        label="Accent colour"
        value={accentSource}
        options={accentSourceOptions}
        onChange={(v) => onChange({ ...settings, accentSource: v as AppearanceSettings["accentSource"] })}
      />
      {accentSource === "kde" ? (
        <label className="setting-row">
          <span>Plasma accent (live)</span>
          <span className="kde-accent-preview">
            <span className="kde-accent-swatch" style={{ backgroundColor: effectiveAccent }} aria-hidden />
            <code className="kde-accent-hex">{effectiveAccent}</code>
          </span>
        </label>
      ) : null}
      <SettingColor
        label={accentSource === "kde" ? "Fallback accent (if Plasma colour unavailable)" : "Accent text colour"}
        value={settings.accentColor}
        onChange={(v) => onChange({ ...settings, accentColor: v })}
      />
      <SettingSelect
        label="Font size"
        value={settings.fontSize}
        options={FONT_SIZE_OPTIONS}
        onChange={(v) => onChange({ ...settings, fontSize: v })}
      />
      <SettingCheckbox
        label="Compact mode"
        checked={settings.compactMode}
        onChange={(v) => onChange({ ...settings, compactMode: v })}
      />
    </SettingsSection>
  );
}
