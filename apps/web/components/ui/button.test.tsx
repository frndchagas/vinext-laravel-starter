import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Save } from "lucide-react";
import Link from "next/link";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Button, buttonVariants } from "./button";

afterEach(cleanup);

describe("buttonVariants", () => {
  it("lets the variant border win over the transparent base border, also outside Button", () => {
    for (const variant of ["outline", "destructive"] as const) {
      const classes = buttonVariants({ variant }).split(" ");
      expect(classes).toContain("border-border-strong");
      expect(classes).not.toContain("border-transparent");
    }
  });

  it("gives a link with the variant the same classes as the Button", () => {
    render(
      <>
        <Button variant="outline">Remind me on the 1st</Button>
        <Link className={buttonVariants({ variant: "outline" })} href="/admin/users">
          Open users
        </Link>
      </>,
    );

    expect(screen.getByRole("link", { name: "Open users" }).className).toBe(
      screen.getByRole("button", { name: "Remind me on the 1st" }).className,
    );
  });

  it("dims a disabled button that stays focusable (aria-disabled) without dropping focus", () => {
    render(
      <Button disabled focusableWhenDisabled variant="outline">
        Sync now
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Sync now" });
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).not.toHaveAttribute("disabled");
    expect(button).toHaveClass(
      "aria-disabled:opacity-50",
      "aria-disabled:cursor-not-allowed",
      "aria-disabled:hover:bg-card",
      "focus-visible:ring-3",
    );
    button.focus();
    expect(button).toHaveFocus();
  });
});

describe("pending Button", () => {
  it("locks on click: aria-busy, off but focusable, spinner and the progress label", () => {
    const onClick = vi.fn<() => void>();
    render(
      <Button onClick={onClick} pending pendingLabel="Saving…">
        <Save aria-hidden="true" data-testid="own-icon" />
        Save
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Saving…" });
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).toHaveAttribute("data-pending");
    expect(button).not.toHaveAttribute("disabled");
    expect(button.querySelector("[data-pending-spinner]")).toHaveClass(
      "animate-spin",
      "motion-reduce:animate-none",
    );
    // The button's own icon leaves the stage while the spinner takes its place.
    expect(button).toHaveClass("[&_svg:not([data-pending-spinner])]:hidden", "cursor-progress!");

    fireEvent.click(button);
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();

    button.focus();
    expect(button).toHaveFocus();
  });

  it("without pendingLabel, keeps the text and only adds the spinner", () => {
    render(<Button pending>Apply</Button>);

    const button = screen.getByRole("button", { name: "Apply" });
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button.querySelector("[data-pending-spinner]")).not.toBeNull();
  });

  it("does not submit the form twice while pending", () => {
    const onSubmit = vi.fn<(event: React.FormEvent) => void>((event) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <Button pending type="submit">
          Import
        </Button>
      </form>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Import" }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("returns to normal when the request finishes", () => {
    const onClick = vi.fn<() => void>();
    const { rerender } = render(
      <Button onClick={onClick} pending pendingLabel="Generating…">
        Generate
      </Button>,
    );
    rerender(
      <Button onClick={onClick} pending={false} pendingLabel="Generating…">
        Generate
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Generate" });
    expect(button).not.toHaveAttribute("aria-busy");
    expect(button).not.toHaveAttribute("aria-disabled");
    expect(button.querySelector("[data-pending-spinner]")).toBeNull();
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("respects the caller's disabled outside pending", () => {
    render(<Button disabled>Pay</Button>);

    const button = screen.getByRole("button", { name: "Pay" });
    expect(button).toBeDisabled();
    expect(button).not.toHaveAttribute("aria-busy");
  });
});
