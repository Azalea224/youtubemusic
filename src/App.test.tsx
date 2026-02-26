import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import type { AppSettings } from "./types";

declare global {
  interface Window {
    __electronAPIMock?: { getLastSetSettings: () => AppSettings | null };
  }
}

describe("App", () => {
  beforeEach(() => {
    // Reset mock so getSettings resolves with default (setup provides it)
    vi.restoreAllMocks();
  });

  it("shows Loading settings... when getSettings has not resolved yet", async () => {
    let resolveGetSettings: (s: AppSettings) => void;
    const getSettingsPromise = new Promise<AppSettings>((resolve) => {
      resolveGetSettings = resolve;
    });
    (window as Window & { electronAPI: typeof window.electronAPI }).electronAPI = {
      ...window.electronAPI!,
      getSettings: () => getSettingsPromise,
      setSettings: window.electronAPI!.setSettings,
      listPlugins: window.electronAPI!.listPlugins,
      debugPlugins: window.electronAPI!.debugPlugins,
    };

    render(<App />);
    expect(screen.getByText("Loading settings...")).toBeInTheDocument();

    const fullSettings: AppSettings = {
      general: { start_minimized: false, minimize_to_tray: true, launch_at_login: false, language: "en-GB" },
      appearance: { theme: "system", accent_color: "#b0b0b0", font_size: "medium", compact_mode: false },
      playback: { default_quality: "auto", crossfade: false, gapless: true, repeat_default: "none", shuffle_default: false },
      discord: { enabled: false, client_id: "", show_buttons: true, hide_listening: false },
      plugins: { enabled_plugins: [] },
      advanced: { data_directory: "", cache_size_mb: 500, debug_mode: false, custom_css: "", custom_js: "" },
    };
    await act(async () => {
      resolveGetSettings!(fullSettings);
      await getSettingsPromise;
    });
  });

  it("shows settings UI and sidebar tabs after settings load", async () => {
    render(<App />);
    await screen.findByRole("button", { name: "General" });
    expect(screen.getByRole("button", { name: "Appearance" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "General" })).toBeInTheDocument();
  });

  it("switches panel when tab is clicked", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("button", { name: "General" });
    expect(screen.getByRole("heading", { name: "General" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Appearance" }));
    expect(screen.getByRole("heading", { name: "Appearance" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Playback" }));
    expect(screen.getByRole("heading", { name: "Playback" })).toBeInTheDocument();
  });

  it("calls setSettings with updated AppSettings when a setting is changed", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("button", { name: "General" });

    await user.click(screen.getByLabelText("Start minimized"));
    const lastSet = window.__electronAPIMock?.getLastSetSettings();
    expect(lastSet).toBeDefined();
    expect(lastSet?.general.start_minimized).toBe(true);
  });
});
