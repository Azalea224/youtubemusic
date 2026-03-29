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

  it("calls onChange with updated showButtons when checkbox is toggled", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DiscordSettings settings={defaultSettings.discord} onChange={onChange} />);
    await user.click(screen.getByLabelText("Show buttons in presence"));
    expect(onChange).toHaveBeenCalledWith({
      ...defaultSettings.discord,
      showButtons: false,
    });
  });

  it("calls onChange with updated hideListening when checkbox is toggled", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DiscordSettings settings={defaultSettings.discord} onChange={onChange} />);
    await user.click(screen.getByLabelText("Hide listening status (privacy)"));
    expect(onChange).toHaveBeenCalledWith({
      ...defaultSettings.discord,
      hideListening: true,
    });
  });

  it("calls onChange with updated useArrpc when checkbox is toggled", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DiscordSettings settings={defaultSettings.discord} onChange={onChange} />);
    await user.click(screen.getByLabelText("Use arRPC (Vencord / Discord Web)"));
    expect(onChange).toHaveBeenCalledWith({
      ...defaultSettings.discord,
      useArrpc: true,
    });
  });
});
