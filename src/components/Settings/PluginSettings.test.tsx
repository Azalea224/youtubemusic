import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PluginSettings } from "./PluginSettings";
import { defaultSettings, resetElectronAPIMock } from "../../test/setup";

describe("PluginSettings", () => {
  beforeEach(() => {
    resetElectronAPIMock();
  });

  it("renders section heading and hint", async () => {
    const onChange = vi.fn();
    render(<PluginSettings settings={defaultSettings.plugins} onChange={onChange} />);
    expect(screen.getByRole("heading", { name: "Plugins" })).toBeInTheDocument();
    expect(
      screen.getByText(/Plugins extend the app with custom functionality/)
    ).toBeInTheDocument();
    await screen.findByText(/No plugins found/);
  });

  it("shows No plugins found when listPlugins returns empty", async () => {
    const onChange = vi.fn();
    render(<PluginSettings settings={defaultSettings.plugins} onChange={onChange} />);
    expect(await screen.findByText(/No plugins found/)).toBeInTheDocument();
  });

  it("shows debug output when Debug plugin status is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    (window as Window & { electronAPI: typeof window.electronAPI }).electronAPI = {
      ...window.electronAPI!,
      getSettings: window.electronAPI!.getSettings,
      setSettings: window.electronAPI!.setSettings,
      listPlugins: () => Promise.resolve([]),
      debugPlugins: () => Promise.resolve({ some: "debug", data: 1 }),
    };
    render(<PluginSettings settings={defaultSettings.plugins} onChange={onChange} />);
    await screen.findByText(/No plugins found/);
    await user.click(screen.getByRole("button", { name: "Debug plugin status" }));
    expect(await screen.findByText(/"some": "debug"/)).toBeInTheDocument();
  });

  it("calls onChange when a plugin is toggled", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    (window as Window & { electronAPI: typeof window.electronAPI }).electronAPI = {
      ...window.electronAPI!,
      getSettings: window.electronAPI!.getSettings,
      setSettings: window.electronAPI!.setSettings,
      listPlugins: () =>
        Promise.resolve([
          ["test-plugin", { name: "Test", version: "1.0.0", main: "index.js", permissions: [] }],
        ]),
      debugPlugins: () => Promise.resolve({}),
    };
    render(<PluginSettings settings={defaultSettings.plugins} onChange={onChange} />);
    expect(await screen.findByText("Test")).toBeInTheDocument();
    await user.click(screen.getByRole("checkbox", { name: "Enabled" }));
    expect(onChange).toHaveBeenCalledWith({
      ...defaultSettings.plugins,
      enabled_plugins: ["test-plugin"],
    });
  });
});
