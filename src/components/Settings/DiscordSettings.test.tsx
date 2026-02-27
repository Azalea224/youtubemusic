import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DiscordSettings } from "./DiscordSettings";
import { defaultSettings } from "../../test/setup";

describe("DiscordSettings", () => {
  it("renders section heading and checkboxes", () => {
    const onChange = vi.fn();
    render(<DiscordSettings settings={defaultSettings.discord} onChange={onChange} />);
    expect(screen.getByRole("heading", { name: "Discord Rich Presence" })).toBeInTheDocument();
    expect(screen.getByLabelText("Enable Discord Rich Presence")).toBeInTheDocument();
    expect(screen.getByLabelText("Show buttons in presence")).toBeInTheDocument();
    expect(screen.getByLabelText("Hide listening status (privacy)")).toBeInTheDocument();
    expect(screen.getByLabelText("Use arRPC (Vencord / Discord Web)")).toBeInTheDocument();
  });

  it("calls onChange with updated enabled when checkbox is toggled", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DiscordSettings settings={defaultSettings.discord} onChange={onChange} />);
    await user.click(screen.getByLabelText("Enable Discord Rich Presence"));
    expect(onChange).toHaveBeenCalledWith({
      ...defaultSettings.discord,
      enabled: true,
    });
  });

  it("calls onChange with updated show_buttons when checkbox is toggled", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DiscordSettings settings={defaultSettings.discord} onChange={onChange} />);
    await user.click(screen.getByLabelText("Show buttons in presence"));
    expect(onChange).toHaveBeenCalledWith({
      ...defaultSettings.discord,
      show_buttons: false,
    });
  });

  it("calls onChange with updated hide_listening when checkbox is toggled", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DiscordSettings settings={defaultSettings.discord} onChange={onChange} />);
    await user.click(screen.getByLabelText("Hide listening status (privacy)"));
    expect(onChange).toHaveBeenCalledWith({
      ...defaultSettings.discord,
      hide_listening: true,
    });
  });

  it("calls onChange with updated use_arrpc when checkbox is toggled", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DiscordSettings settings={defaultSettings.discord} onChange={onChange} />);
    await user.click(screen.getByLabelText("Use arRPC (Vencord / Discord Web)"));
    expect(onChange).toHaveBeenCalledWith({
      ...defaultSettings.discord,
      use_arrpc: true,
    });
  });
});
