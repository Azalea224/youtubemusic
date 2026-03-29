import { describe, it, expect, beforeEach } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import type { AppSettings } from "./types";
import { defaultSettings, resetElectronAPIMock } from "./test/setup";

describe("App", () => {
  beforeEach(() => {
    resetElectronAPIMock();
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

    await act(async () => {
      resolveGetSettings!(defaultSettings);
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

    await user.click(screen.getByRole("button", { name: "Discord" }));
    expect(screen.getByRole("heading", { name: "Discord Rich Presence" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Plugins" }));
    expect(screen.getByRole("heading", { name: "Plugins" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Advanced" }));
    expect(screen.getByRole("heading", { name: "Advanced" })).toBeInTheDocument();
  });

  it("calls setSettings with updated AppSettings when a setting is changed", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("button", { name: "General" });

    await user.click(screen.getByLabelText("Start minimized"));
    const lastSet = window.__electronAPIMock?.getLastSetSettings();
    expect(lastSet).toBeDefined();
    expect(lastSet?.general.startMinimized).toBe(true);
  });
});
