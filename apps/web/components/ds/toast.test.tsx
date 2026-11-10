import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Toaster, toast } from "./toast";

beforeEach(() => {
  // jsdom has no matchMedia; react-hot-toast queries prefers-reduced-motion.
  vi.stubGlobal("matchMedia", (query: string) => ({
    addEventListener: () => undefined,
    matches: false,
    media: query,
    removeEventListener: () => undefined,
  }));
});

afterEach(() => {
  act(() => toast.remove());
  cleanup();
  vi.unstubAllGlobals();
});

describe("toast", () => {
  it("sits below the sticky header on phones and 16 px from the top on desktop", () => {
    render(<Toaster />);

    const region = screen.getByRole("region", { name: "Notifications (Alt+T)" });
    expect(region).toHaveClass("fixed", "inset-4", "max-lg:top-16");
  });

  it("toast.action calls onAction and dismisses the toast", async () => {
    const onAction = vi.fn<() => void>();
    render(<Toaster />);

    act(() => {
      toast.action("5 users moved to Admins", { label: "Undo", onAction });
    });

    const status = await screen.findByRole("status");
    expect(status).toHaveTextContent("5 users moved to Admins");
    expect(screen.getByRole("button", { name: "Dismiss notification" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Undo" }));

    expect(onAction).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(
        screen.getByText("5 users moved to Admins").closest("[data-slot=toast]"),
      ).toHaveAttribute("data-visible", "false"),
    );
  });

  it("toast.action with a second action shows both verbs and calls only the clicked one", async () => {
    const apply = vi.fn<() => void>();
    const undo = vi.fn<() => void>();
    render(<Toaster />);

    act(() => {
      toast.action("Rule applied to 1 item", {
        description: "Rule “hostweb → Infra” created",
        label: "Apply to 12 pending",
        onAction: apply,
        secondary: { label: "Undo", onAction: undo },
      });
    });

    fireEvent.click(await screen.findByRole("button", { name: "Undo" }));
    expect(undo).toHaveBeenCalledTimes(1);
    expect(apply).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Apply to 12 pending" })).toBeInTheDocument();
  });

  it("toast.ai shows the violet AI icon in place of the default icon", async () => {
    render(<Toaster />);

    act(() => {
      toast.ai("AI classified 103 items · 7 went to the to-do list");
    });

    await screen.findByText("AI classified 103 items · 7 went to the to-do list");
    const icon = document.querySelector("[data-slot=toast-ai-icon] svg");
    expect(icon).not.toBeNull();
    expect(icon).toHaveClass("text-ai-ink");
  });
});
