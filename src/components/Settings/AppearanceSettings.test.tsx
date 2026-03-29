import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppearanceSettings } from "./AppearanceSettings";
import type { AppearanceSettings as AppearanceSettingsType } from "../../types";
import { defaultSettings } from "../../test/setup";

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
    render(<AppearanceSettings settings={defaultSettings.appearance} onChange={onChange} />);
    expect(screen.getByRole("heading", { name: "Appearance" })).toBeInTheDocument();
    expect(screen.getByLabelText("Theme")).toBeInTheDocument();
    expect(screen.getByLabelText("Accent text colour")).toBeInTheDocument();
    expect(screen.getByLabelText("Font size")).toBeInTheDocument();
    expect(screen.getByLabelText("Compact mode")).toBeInTheDocument();
  });

  it("calls onChange with updated theme when select changes", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<AppearanceSettings settings={defaultSettings.appearance} onChange={onChange} />);
    await user.selectOptions(screen.getByLabelText("Theme"), "dark");
    expect(onChange).toHaveBeenCalledWith({
      ...defaultSettings.appearance,
      theme: "dark",
    });
  });

  it("calls onChange with updated accentColor when color input changes", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ControlledAppearanceWrapper
        initialSettings={defaultSettings.appearance}
        onChange={onChange}
      />
    );
    const colorTextInput = screen.getByRole("textbox");
    await user.clear(colorTextInput);
    await user.type(colorTextInput, "#ff0000");
    expect(onChange).toHaveBeenLastCalledWith({
      ...defaultSettings.appearance,
      accentColor: "#ff0000",
    });
  });

  it("calls onChange with updated fontSize when select changes", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<AppearanceSettings settings={defaultSettings.appearance} onChange={onChange} />);
    await user.selectOptions(screen.getByLabelText("Font size"), "large");
    expect(onChange).toHaveBeenCalledWith({
      ...defaultSettings.appearance,
      fontSize: "large",
    });
  });

  it("calls onChange with updated compactMode when checkbox is toggled", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<AppearanceSettings settings={defaultSettings.appearance} onChange={onChange} />);
    await user.click(screen.getByLabelText("Compact mode"));
    expect(onChange).toHaveBeenCalledWith({
      ...defaultSettings.appearance,
      compactMode: true,
    });
  });
});
