import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdvancedSettings } from "./AdvancedSettings";
import { defaultSettings } from "../../test/setup";

describe("AdvancedSettings", () => {
  it("renders section heading and textareas", () => {
    const onChange = vi.fn();
    render(<AdvancedSettings settings={defaultSettings.advanced} onChange={onChange} />);
    expect(screen.getByRole("heading", { name: "Advanced" })).toBeInTheDocument();
    expect(screen.getByLabelText("Custom CSS injection")).toBeInTheDocument();
    expect(screen.getByLabelText("Custom JS injection")).toBeInTheDocument();
  });

  it("calls onChange with updated custom_css when CSS textarea is edited", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<AdvancedSettings settings={defaultSettings.advanced} onChange={onChange} />);
    const cssInput = screen.getByLabelText("Custom CSS injection");
    await user.type(cssInput, "x");
    expect(onChange).toHaveBeenCalledWith({
      ...defaultSettings.advanced,
      custom_css: "x",
    });
  });

  it("calls onChange with updated custom_js when JS textarea is edited", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<AdvancedSettings settings={defaultSettings.advanced} onChange={onChange} />);
    const jsInput = screen.getByLabelText("Custom JS injection");
    await user.type(jsInput, "x");
    expect(onChange).toHaveBeenCalledWith({
      ...defaultSettings.advanced,
      custom_js: "x",
    });
  });
});
