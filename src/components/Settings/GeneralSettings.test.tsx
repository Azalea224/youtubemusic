import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GeneralSettings } from "./GeneralSettings";
import { defaultSettings } from "../../test/setup";

describe("GeneralSettings", () => {
  it("renders section heading and checkboxes", () => {
    const onChange = vi.fn();
    render(<GeneralSettings settings={defaultSettings.general} onChange={onChange} />);
    expect(screen.getByRole("heading", { name: "General" })).toBeInTheDocument();
    expect(screen.getByLabelText("Start minimized")).toBeInTheDocument();
    expect(screen.getByLabelText("Minimize to tray")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /Launch at login/ })).toBeInTheDocument();
  });

  it("calls onChange with updated startMinimized when checkbox is toggled", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<GeneralSettings settings={defaultSettings.general} onChange={onChange} />);
    await user.click(screen.getByLabelText("Start minimized"));
    expect(onChange).toHaveBeenCalledWith({
      ...defaultSettings.general,
      startMinimized: true,
    });
  });

  it("calls onChange with updated minimizeToTray when checkbox is toggled", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<GeneralSettings settings={defaultSettings.general} onChange={onChange} />);
    await user.click(screen.getByLabelText("Minimize to tray"));
    expect(onChange).toHaveBeenCalledWith({
      ...defaultSettings.general,
      minimizeToTray: false,
    });
  });

  it("calls onChange with updated launchAtLogin when checkbox is toggled", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<GeneralSettings settings={defaultSettings.general} onChange={onChange} />);
    await user.click(screen.getByRole("checkbox", { name: /Launch at login/ }));
    expect(onChange).toHaveBeenCalledWith({
      ...defaultSettings.general,
      launchAtLogin: true,
    });
  });
});
