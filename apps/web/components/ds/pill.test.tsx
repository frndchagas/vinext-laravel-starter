import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { StatusPill, type PillTone } from "./pill";

afterEach(cleanup);

describe("StatusPill", () => {
  it.each<[PillTone, string]>([
    ["attention", "bg-attention-mark"],
    ["negative", "bg-negative"],
  ])("keeps %s in the dot and the text neutral on the gray pill", (tone, dot) => {
    render(<StatusPill tone={tone}>Waiting for credentials</StatusPill>);
    const pill = screen.getByText("Waiting for credentials");

    expect(pill).toHaveClass("bg-pill", "text-foreground");
    expect(pill.className).not.toMatch(/text-(positive|attention|negative)/);
    expect(pill.className).not.toMatch(/bg-(positive|attention|negative)/);
    expect(pill.querySelector("[aria-hidden='true']")).toHaveClass(dot);
  });

  it("draws the positive tone as a neutral gray check, never green", () => {
    render(<StatusPill tone="positive">Done</StatusPill>);
    const pill = screen.getByText("Done");
    const mark = pill.querySelector("[aria-hidden='true']");

    expect(pill).toHaveClass("bg-pill", "text-foreground");
    expect(mark?.tagName.toLowerCase()).toBe("svg");
    expect(mark).toHaveClass("lucide-circle-check", "text-muted-foreground");
    expect(pill.innerHTML).not.toMatch(/positive/);
  });

  it("draws the neutral tone in muted gray without a dot", () => {
    render(<StatusPill>Manual only</StatusPill>);
    const pill = screen.getByText("Manual only");

    expect(pill).toHaveClass("bg-pill", "text-muted-foreground");
    expect(pill.querySelector("[aria-hidden='true']")).toBeNull();
  });

  it("adds a gray dot to the neutral tone when asked", () => {
    render(<StatusPill dot>Disabled</StatusPill>);
    const pill = screen.getByText("Disabled");

    expect(pill).toHaveClass("bg-pill", "text-muted-foreground");
    expect(pill.querySelector("[aria-hidden='true']")).toHaveClass("bg-subtle-foreground");
  });
});
