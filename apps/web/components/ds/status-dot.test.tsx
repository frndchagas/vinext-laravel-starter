import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { type DotTone, StatusDot } from "./status-dot";

afterEach(cleanup);

describe("StatusDot", () => {
  it.each<[DotTone, string]>([
    ["negative", "bg-negative"],
    ["attention", "bg-attention-mark"],
    ["neutral", "bg-subtle-foreground"],
  ])("keeps the %s state in a colored dot", (tone, dot) => {
    render(<StatusDot tone={tone}>Overdue</StatusDot>);
    const mark = screen.getByText("Overdue").querySelector("[aria-hidden='true']");

    expect(mark?.tagName.toLowerCase()).toBe("span");
    expect(mark).toHaveClass("rounded-full", dot);
  });

  it("draws the positive state as a neutral gray check, never green", () => {
    render(<StatusDot tone="positive">On time</StatusDot>);
    const status = screen.getByText("On time");
    const mark = status.querySelector("[aria-hidden='true']");

    expect(status).toHaveClass("text-foreground");
    expect(mark?.tagName.toLowerCase()).toBe("svg");
    expect(mark).toHaveClass("lucide-circle-check", "text-muted-foreground");
    expect(status.innerHTML).not.toMatch(/positive/);
  });
});
