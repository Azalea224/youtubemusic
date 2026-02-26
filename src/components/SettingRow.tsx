import type { ReactNode } from "react";

export interface SettingCheckboxProps {
  label: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: ReactNode;
}

export function SettingCheckbox({ label, checked, onChange, hint }: SettingCheckboxProps) {
  return (
    <label className="setting-row">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label}</span>
      {hint && <span className="restart-hint">{hint}</span>}
    </label>
  );
}

export interface SettingSelectOption {
  value: string;
  label: string;
}

export interface SettingSelectProps {
  label: string;
  value: string;
  options: SettingSelectOption[];
  onChange: (value: string) => void;
}

export function SettingSelect({ label, value, options, onChange }: SettingSelectProps) {
  return (
    <label className="setting-row">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export interface SettingTextProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SettingText({ label, value, onChange, placeholder }: SettingTextProps) {
  return (
    <label className="setting-row">
      <span>{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

export interface SettingNumberProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}

export function SettingNumber({ label, value, min, max, onChange }: SettingNumberProps) {
  return (
    <label className="setting-row">
      <span>{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10) || 0)}
      />
    </label>
  );
}

export interface SettingColorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export function SettingColor({ label, value, onChange }: SettingColorProps) {
  return (
    <label className="setting-row">
      <span>{label}</span>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <input
        type="text"
        className="color-text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

export interface SettingTextareaProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}

export function SettingTextarea({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
}: SettingTextareaProps) {
  return (
    <label className="setting-row full-width">
      <span>{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
      />
    </label>
  );
}
