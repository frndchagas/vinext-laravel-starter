import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Disclosure } from "./disclosure";

afterEach(cleanup);

describe("Disclosure", () => {
  it("opens from the chevron label, without the browser marker, and reports the toggle", () => {
    const onToggle = vi.fn<(open: boolean) => void>();
    render(
      <Disclosure label="How to connect the bank" onToggle={onToggle}>
        <p>Step 1</p>
      </Disclosure>,
    );

    const summary = screen.getByText("How to connect the bank");
    const details = summary.closest("details");
    if (details === null) throw new Error("The content should live in a <details>.");

    expect(summary).toHaveClass("list-none");
    expect(summary.querySelector("svg.lucide-chevron-right")).not.toBeNull();
    expect(details).not.toHaveAttribute("open");

    fireEvent.click(summary);
    expect(details).toHaveAttribute("open");
    fireEvent(details, new Event("toggle"));
    expect(onToggle).toHaveBeenCalledWith(true);
  });

  it("starts open with defaultOpen", () => {
    render(
      <Disclosure defaultOpen label="Show calculation">
        <p>$20,000.00 minimum</p>
      </Disclosure>,
    );

    expect(screen.getByText("Show calculation").closest("details")).toHaveAttribute("open");
  });
});
