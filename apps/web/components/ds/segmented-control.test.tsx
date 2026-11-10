import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SegmentedControl } from "./segmented-control";

afterEach(cleanup);

type Period = "week" | "month";

function Harness({ onChange }: { onChange: (value: Period) => void }) {
  const [value, setValue] = useState<Period>("week");

  return (
    <SegmentedControl
      ariaLabel="Period"
      onValueChange={(next) => {
        setValue(next);
        onChange(next);
      }}
      options={[
        { label: "This week", short: "Week", value: "week" },
        { label: "This month", short: "Month", value: "month" },
      ]}
      value={value}
    />
  );
}

describe("SegmentedControl", () => {
  it("is a radiogroup whose options switch on click", () => {
    const onChange = vi.fn<(value: Period) => void>();
    render(<Harness onChange={onChange} />);

    const group = screen.getByRole("radiogroup", { name: "Period" });
    const week = screen.getByRole("radio", { name: /This week/ });
    const month = screen.getByRole("radio", { name: /This month/ });
    expect(group).toContainElement(week);
    expect(week).toHaveAttribute("aria-checked", "true");

    fireEvent.click(month);
    expect(onChange).toHaveBeenCalledWith("month");
    expect(month).toHaveAttribute("aria-checked", "true");
    expect(week).toHaveAttribute("aria-checked", "false");
  });

  it("shows the short label only on phones", () => {
    render(<Harness onChange={() => undefined} />);

    expect(screen.getByText("Week")).toHaveClass("sm:hidden");
    expect(screen.getByText("This week")).toHaveClass("hidden", "sm:inline");
  });
});
