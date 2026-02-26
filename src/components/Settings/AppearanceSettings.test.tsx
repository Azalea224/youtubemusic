import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppearanceSettings } from "./AppearanceSettings";
import type { AppearanceSettings as AppearanceSettingsType } from "../../types";

const defaultSettings: AppearanceSettingsType = {
  theme: "system",
  accent_color: "#1a73e8",
  font_size: "medium",
  compact_mode: false,
};

function ControlledAppearanceWrapper({
  initialSettings,
  onChange,
}: {
  initialSettings: AppearanceSettingsType;
  onChange: (s: AppearanceSettingsType) => void;
}) {
  const [settings, setSettings] = useState(initialSettings);
  return (
    <AppearanceSettings
      settings={settings}
      onChange={(s) => {
        setSettings(s);
        onChange(s);
      }}
    />
  );
}

describe("AppearanceSettings", () => {
  it("renders section heading and controls", () => {
    const onChange = vi.fn();
    render(<AppearanceSettings settings={defaultSettings} onChange={onChange} />);
    expect(screen.getByRole("heading", { name: "Appearance" })).toBeInTheDocument();
    expect(screen.getByLabelText("Theme")).toBeInTheDocument();
    expect(screen.getByLabelText("Accent color")).toBeInTheDocument();
    expect(screen.getByLabelText("Font size")).toBeInTheDocument();
    expect(screen.getByLabelText("Compact mode")).toBeInTheDocument();
  });

  it("calls onChange with updated theme when select changes", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<AppearanceSettings settings={defaultSettings} onChange={onChange} />);
    await user.selectOptions(screen.getByLabelText("Theme"), "dark");
    expect(onChange).toHaveBeenCalledWith({
      ...defaultSettings,
      theme: "dark",
    });
  });

  it("calls onChange with updated accent_color when color input changes", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ControlledAppearanceWrapper
        initialSettings={defaultSettings}
        onChange={onChange}
      />
    );
    const colorTextInput = screen.getByRole("textbox");
    await user.clear(colorTextInput);
    await user.type(colorTextInput, "#ff0000");
    expect(onChange).toHaveBeenLastCalledWith({
      ...defaultSettings,
      accent_color: "#ff0000",
    });
  });

  it("calls onChange with updated font_size when select changes", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<AppearanceSettings settings={defaultSettings} onChange={onChange} />);
    await user.selectOptions(screen.getByLabelText("Font size"), "large");
    expect(onChange).toHaveBeenCalledWith({
      ...defaultSettings,
      font_size: "large",
    });
  });

  it("calls onChange with updated compact_mode when checkbox is toggled", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<AppearanceSettings settings={defaultSettings} onChange={onChange} />);
    await user.click(screen.getByLabelText("Compact mode"));
    expect(onChange).toHaveBeenCalledWith({
      ...defaultSettings,
      compact_mode: true,
    });
  });
});
