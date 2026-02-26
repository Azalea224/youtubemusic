import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GeneralSettings } from "./GeneralSettings";
import type { GeneralSettings as GeneralSettingsType } from "../../types";

const defaultSettings: GeneralSettingsType = {
  start_minimized: false,
  minimize_to_tray: true,
  launch_at_login: false,
  language: "en",
};

describe("GeneralSettings", () => {
  it("renders section heading and checkboxes", () => {
    const onChange = vi.fn();
    render(<GeneralSettings settings={defaultSettings} onChange={onChange} />);
    expect(screen.getByRole("heading", { name: "General" })).toBeInTheDocument();
    expect(screen.getByLabelText("Start minimized")).toBeInTheDocument();
    expect(screen.getByLabelText("Minimize to tray")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /Launch at login/ })).toBeInTheDocument();
  });

  it("calls onChange with updated start_minimized when checkbox is toggled", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<GeneralSettings settings={defaultSettings} onChange={onChange} />);
    await user.click(screen.getByLabelText("Start minimized"));
    expect(onChange).toHaveBeenCalledWith({
      ...defaultSettings,
      start_minimized: true,
    });
  });

  it("calls onChange with updated minimize_to_tray when checkbox is toggled", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<GeneralSettings settings={defaultSettings} onChange={onChange} />);
    await user.click(screen.getByLabelText("Minimize to tray"));
    expect(onChange).toHaveBeenCalledWith({
      ...defaultSettings,
      minimize_to_tray: false,
    });
  });

  it("calls onChange with updated launch_at_login when checkbox is toggled", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<GeneralSettings settings={defaultSettings} onChange={onChange} />);
    await user.click(screen.getByRole("checkbox", { name: /Launch at login/ }));
    expect(onChange).toHaveBeenCalledWith({
      ...defaultSettings,
      launch_at_login: true,
    });
  });
});
