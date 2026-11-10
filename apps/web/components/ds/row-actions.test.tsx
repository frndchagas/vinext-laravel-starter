import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { Archive, Check, CircleOff, Pencil } from "lucide-react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { RowActions, RowPrimaryAction } from "./row-actions";

afterEach(cleanup);

function renderMenu(options: { disabled?: boolean; archiveDisabled?: boolean } = {}) {
  const onArchive = vi.fn<() => void>();
  const onEnd = vi.fn<() => void>();
  render(
    <RowActions
      actions={[
        {
          disabled: options.archiveDisabled,
          icon: Archive,
          key: "archive",
          label: "Archive",
          onSelect: onArchive,
        },
        {
          destructive: true,
          icon: CircleOff,
          key: "end",
          label: "Revoke session",
          onSelect: onEnd,
        },
      ]}
      disabled={options.disabled}
      label="More actions for Ada Lovelace"
    />,
  );
  return { onArchive, onEnd };
}

describe("RowActions", () => {
  it("names the trigger after the row and lists the actions in a menu", async () => {
    renderMenu();
    const trigger = screen.getByRole("button", { name: "More actions for Ada Lovelace" });
    expect(trigger).toHaveAttribute("aria-haspopup", "menu");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    fireEvent.click(trigger);
    const menu = await screen.findByRole("menu");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    const items = within(menu).getAllByRole("menuitem");
    expect(items.map((item) => item.textContent)).toEqual(["Archive", "Revoke session"]);
    // Destructive: only red text, no colored background.
    expect(items[1]).toHaveClass("text-negative");
    expect(items[1]?.className).not.toMatch(/bg-(negative|destructive)/);
    expect(items[0]).not.toHaveClass("text-negative");
  });

  it("runs the chosen action and closes the menu", async () => {
    const { onArchive, onEnd } = renderMenu();
    fireEvent.click(screen.getByRole("button", { name: "More actions for Ada Lovelace" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Revoke session" }));

    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(onArchive).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
  });

  it("opens from the keyboard and moves between items with the arrows", async () => {
    const { onArchive } = renderMenu();
    const trigger = screen.getByRole("button", { name: "More actions for Ada Lovelace" });
    trigger.focus();
    fireEvent.keyDown(trigger, { key: "ArrowDown" });

    const menu = await screen.findByRole("menu");
    const [archive, end] = within(menu).getAllByRole("menuitem");
    await waitFor(() => expect(archive).toHaveFocus());
    fireEvent.keyDown(archive ?? menu, { key: "ArrowDown" });
    await waitFor(() => expect(end).toHaveFocus());
    fireEvent.keyDown(end ?? menu, { key: "ArrowUp" });
    await waitFor(() => expect(archive).toHaveFocus());

    fireEvent.click(archive ?? menu);
    expect(onArchive).toHaveBeenCalledTimes(1);
  });

  it("closes with Escape and returns focus to the trigger", async () => {
    renderMenu();
    const trigger = screen.getByRole("button", { name: "More actions for Ada Lovelace" });
    fireEvent.click(trigger);
    const menu = await screen.findByRole("menu");
    fireEvent.keyDown(menu, { key: "Escape" });

    await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("keeps disabled actions out of reach", async () => {
    const { onArchive } = renderMenu({ archiveDisabled: true });
    fireEvent.click(screen.getByRole("button", { name: "More actions for Ada Lovelace" }));
    const archive = await screen.findByRole("menuitem", { name: "Archive" });
    expect(archive).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(archive);
    expect(onArchive).not.toHaveBeenCalled();
  });

  it("disables the trigger while the row cannot change", () => {
    renderMenu({ disabled: true });
    expect(screen.getByRole("button", { name: "More actions for Ada Lovelace" })).toBeDisabled();
  });
});

describe("RowPrimaryAction", () => {
  it("is a light ghost button that gains the outline only on row hover or focus", () => {
    const onClick = vi.fn<() => void>();
    render(
      <RowPrimaryAction
        ariaLabel="Mark Ada Lovelace as verified"
        icon={Check}
        label="Mark as verified"
        onClick={onClick}
      />,
    );
    const button = screen.getByRole("button", { name: "Mark Ada Lovelace as verified" });

    expect(button).toHaveTextContent("Mark as verified");
    expect(button.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    // At rest: no outline or shadow of the outlined button; the highlight comes from the row.
    expect(button).toHaveClass("border-transparent", "text-muted-foreground");
    expect(button.className).not.toMatch(/(^| )(border-border-strong|shadow-card)( |$)/);
    expect(button).toHaveClass(
      "group-hover/row:border-border-strong",
      "group-focus-within/row:border-border-strong",
    );
    // The button's own focus stays visible.
    expect(button).toHaveClass("focus-visible:ring-3");

    button.focus();
    expect(button).toHaveFocus();
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("can keep only the icon on mobile without losing the accessible name", () => {
    render(
      <RowPrimaryAction
        ariaLabel="Edit Taxes"
        icon={Pencil}
        label="Edit"
        labelFrom="md"
        onClick={() => undefined}
      />,
    );
    const button = screen.getByRole("button", { name: "Edit Taxes" });

    expect(screen.getByText("Edit")).toHaveClass("hidden", "md:inline");
    expect(button).toBeEnabled();
  });

  it("stays out of reach while disabled", () => {
    const onClick = vi.fn<() => void>();
    render(
      <RowPrimaryAction
        ariaLabel="Edit Taxes"
        disabled
        icon={Pencil}
        label="Edit"
        onClick={onClick}
      />,
    );
    const button = screen.getByRole("button", { name: "Edit Taxes" });

    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });
});
