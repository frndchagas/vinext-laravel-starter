"use client";

import { Menu } from "@base-ui/react/menu";
import { Ellipsis, type LucideIcon } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { POPUP_CLASS } from "./popup";

export type RowAction = {
  key: string;
  /** Short verb ("Revoke session"): the "…" button already says which row it belongs to. */
  label: string;
  icon?: LucideIcon;
  onSelect: () => void;
  /** Red text, no background: ends or deletes something. */
  destructive?: boolean | undefined;
  disabled?: boolean | undefined;
};

const ITEM_CLASS =
  "flex h-8 cursor-default items-center gap-2 rounded-md px-2 text-body whitespace-nowrap outline-none select-none data-disabled:opacity-50 data-highlighted:bg-muted";

/**
 * Outline and full ink only when the row is hovered or focused (`group/row` of `DataTable`);
 * at rest, the action is gray and borderless so it does not outweigh the row's value.
 */
const PRIMARY_CLASS =
  "text-muted-foreground group-focus-within/row:border-border-strong group-focus-within/row:text-foreground group-hover/row:border-border-strong group-hover/row:text-foreground";

/**
 * Primary action of the row ("Mark as received", "Edit"): 32 px ghost button with icon and verb.
 * `ariaLabel` says which row it belongs to ("Edit Ada Lovelace"). `labelFrom="md"` hides the verb on
 * phones and leaves only the icon (the accessible name stays). The verb is the same on phones and
 * desktop: if it does not fit on the item's line, the action drops to the next line.
 */
export function RowPrimaryAction({
  ariaLabel,
  className,
  disabled = false,
  icon: Icon,
  label,
  labelFrom,
  onClick,
  pending = false,
}: {
  ariaLabel: string;
  className?: string;
  disabled?: boolean | undefined;
  icon: LucideIcon;
  label: string;
  labelFrom?: "md";
  onClick: () => void;
  /** The click's request is in flight: locks and spins in place of the icon (see `Button`). */
  pending?: boolean;
}) {
  return (
    <Button
      aria-label={ariaLabel}
      className={cn(PRIMARY_CLASS, className)}
      disabled={disabled}
      onClick={onClick}
      pending={pending}
      size="sm"
      variant="ghost"
    >
      <Icon aria-hidden="true" />
      <span className={labelFrom === "md" ? "hidden md:inline" : undefined}>{label}</span>
    </Button>
  );
}

/**
 * Secondary actions of a table row: 32 px ghost "…" button that opens a menu (Base UI).
 * The primary action stays visible beside it (`RowPrimaryAction`); the menu is always shown (not
 * only on hover) and opens from the keyboard.
 */
export function RowActions({
  actions,
  className,
  disabled = false,
  label,
}: {
  actions: readonly RowAction[];
  className?: string;
  disabled?: boolean | undefined;
  /** Name of the button with the row ("More actions for Ada Lovelace"). */
  label: string;
}) {
  if (actions.length === 0) return null;

  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label={label}
        className={cn(
          buttonVariants({ size: "icon-sm", variant: "ghost" }),
          "text-muted-foreground data-popup-open:bg-muted data-popup-open:text-foreground",
          className,
        )}
        disabled={disabled}
      >
        <Ellipsis aria-hidden="true" className="size-4" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner align="end" className="z-50" sideOffset={4}>
          <Menu.Popup className={cn(POPUP_CLASS, "min-w-40 p-1")}>
            {actions.map((action) => {
              const Icon = action.icon;
              return (
                <Menu.Item
                  className={cn(ITEM_CLASS, action.destructive === true && "text-negative")}
                  disabled={action.disabled}
                  key={action.key}
                  onClick={action.onSelect}
                >
                  {Icon !== undefined ? (
                    <Icon
                      aria-hidden="true"
                      className={cn(
                        "size-3.5 shrink-0",
                        action.destructive !== true && "text-muted-foreground",
                      )}
                    />
                  ) : null}
                  {action.label}
                </Menu.Item>
              );
            })}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
