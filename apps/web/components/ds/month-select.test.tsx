import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Label } from "@/components/ui/label";

import { MonthSelect, monthOptions } from "./month-select";

afterEach(cleanup);

function Harness({ onChange }: { onChange: (month: string) => void }) {
  const [month, setMonth] = useState("2026-02");

  return (
    <form data-testid="form">
      <Label htmlFor="month">Month</Label>
      <MonthSelect
        id="month"
        max="2026-03"
        min="2025-12"
        name="month"
        onValueChange={(next) => {
          setMonth(next);
          onChange(next);
        }}
        value={month}
      />
    </form>
  );
}

describe("MonthSelect", () => {
  it("lists from the most recent to the oldest and keeps a value outside the range", () => {
    expect(monthOptions("2025-11", "2026-02")).toEqual([
      "2026-02",
      "2026-01",
      "2025-12",
      "2025-11",
    ]);
    expect(monthOptions("2026-01", "2026-02", "2025-12")).toEqual([
      "2026-02",
      "2026-01",
      "2025-12",
    ]);
    expect(monthOptions("2026-01", "2026-02", "")).toEqual(["2026-02", "2026-01"]);
  });

  it("shows the month name and returns YYYY-MM", async () => {
    const onChange = vi.fn<(month: string) => void>();
    render(<Harness onChange={onChange} />);

    const trigger = screen.getByLabelText("Month");
    expect(trigger).toHaveTextContent("Feb 2026");

    fireEvent.click(trigger);
    const option = await screen.findByRole("option", { name: "Dec 2025" });
    // Base UI only accepts a mouse click that started on the item.
    fireEvent.pointerDown(option);
    fireEvent.click(option);

    expect(onChange).toHaveBeenCalledWith("2025-12");
    expect(trigger).toHaveTextContent("Dec 2025");
    const form = screen.getByTestId("form");
    if (!(form instanceof HTMLFormElement)) throw new Error("form expected");
    expect(new FormData(form).get("month")).toBe("2025-12");
  });
});
