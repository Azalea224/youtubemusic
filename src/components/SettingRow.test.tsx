import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  SettingCheckbox,
  SettingSelect,
  SettingText,
  SettingNumber,
  SettingColor,
  SettingTextarea,
} from "./SettingRow";

function ControlledColorWrapper({
  initialValue,
  onChange,
}: {
  initialValue: string;
  onChange: (v: string) => void;
}) {
  const [value, setValue] = useState(initialValue);
  return (
    <SettingColor
      label="Accent color"
      value={value}
      onChange={(v) => {
        setValue(v);
        onChange(v);
      }}
    />
  );
}

describe("SettingCheckbox", () => {
  it("renders label and checkbox", () => {
    const onChange = vi.fn();
    render(
      <SettingCheckbox label="Start minimized" checked={false} onChange={onChange} />
    );
    expect(screen.getByRole("checkbox")).toBeInTheDocument();
    expect(screen.getByText("Start minimized")).toBeInTheDocument();
  });

  it("calls onChange with true when unchecked box is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SettingCheckbox label="Start minimized" checked={false} onChange={onChange} />
    );
    await user.click(screen.getByRole("checkbox"));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("calls onChange with false when checked box is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SettingCheckbox label="Start minimized" checked={true} onChange={onChange} />
    );
    await user.click(screen.getByRole("checkbox"));
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it("renders hint when provided", () => {
    const onChange = vi.fn();
    render(
      <SettingCheckbox
        label="Launch at login"
        checked={false}
        onChange={onChange}
        hint="(Restart required)"
      />
    );
    expect(screen.getByText("(Restart required)")).toBeInTheDocument();
  });
});

describe("SettingSelect", () => {
  it("renders label and options", () => {
    const onChange = vi.fn();
    const options = [
      { value: "system", label: "System" },
      { value: "light", label: "Light" },
    ];
    render(
      <SettingSelect
        label="Theme"
        value="system"
        options={options}
        onChange={onChange}
      />
    );
    expect(screen.getByLabelText("Theme")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveValue("system");
  });

  it("calls onChange when option is selected", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const options = [
      { value: "system", label: "System" },
      { value: "dark", label: "Dark" },
    ];
    render(
      <SettingSelect
        label="Theme"
        value="system"
        options={options}
        onChange={onChange}
      />
    );
    await user.selectOptions(screen.getByRole("combobox"), "dark");
    expect(onChange).toHaveBeenCalledWith("dark");
  });
});

describe("SettingText", () => {
  it("renders label and input", () => {
    const onChange = vi.fn();
    render(
      <SettingText label="Client ID" value="" onChange={onChange} />
    );
    expect(screen.getByLabelText("Client ID")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveValue("");
  });

  it("calls onChange when text is typed", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SettingText label="Client ID" value="" onChange={onChange} />
    );
    await user.type(screen.getByRole("textbox"), "abc");
    expect(onChange).toHaveBeenCalledTimes(3);
    expect(onChange).toHaveBeenLastCalledWith("c");
  });
});

describe("SettingNumber", () => {
  it("renders label and number input", () => {
    const onChange = vi.fn();
    render(
      <SettingNumber label="Cache size" value={500} onChange={onChange} />
    );
    expect(screen.getByLabelText("Cache size")).toBeInTheDocument();
    expect(screen.getByRole("spinbutton")).toHaveValue(500);
  });

  it("calls onChange with parsed number when value changes", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SettingNumber label="Cache size" value={500} onChange={onChange} min={0} max={2000} />
    );
    const input = screen.getByRole("spinbutton");
    await user.clear(input);
    await user.type(input, "100");
    expect(onChange).toHaveBeenCalled();
  });
});

describe("SettingColor", () => {
  it("renders label and color/text inputs", () => {
    const onChange = vi.fn();
    render(
      <SettingColor label="Accent color" value="#1a73e8" onChange={onChange} />
    );
    expect(screen.getByLabelText("Accent color")).toBeInTheDocument();
    const inputs = screen.getAllByDisplayValue("#1a73e8");
    expect(inputs).toHaveLength(2);
  });

  it("calls onChange when color text is changed", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ControlledColorWrapper initialValue="#1a73e8" onChange={onChange} />
    );
    const textInput = screen.getByRole("textbox");
    await user.clear(textInput);
    await user.type(textInput, "#ff0000");
    expect(onChange).toHaveBeenLastCalledWith("#ff0000");
  });
});

describe("SettingTextarea", () => {
  it("renders label and textarea", () => {
    const onChange = vi.fn();
    render(
      <SettingTextarea label="Custom CSS" value="" onChange={onChange} />
    );
    expect(screen.getByLabelText("Custom CSS")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveValue("");
  });

  it("calls onChange when text is typed", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SettingTextarea label="Custom CSS" value="" onChange={onChange} />
    );
    await user.type(screen.getByRole("textbox"), "body");
    expect(onChange).toHaveBeenCalled();
  });

  it("uses default rows when not provided", () => {
    const onChange = vi.fn();
    render(
      <SettingTextarea label="Custom CSS" value="" onChange={onChange} />
    );
    expect(screen.getByRole("textbox")).toHaveAttribute("rows", "4");
  });
});
