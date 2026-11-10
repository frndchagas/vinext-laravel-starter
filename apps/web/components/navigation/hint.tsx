"use client";

import { Tooltip } from "@base-ui/react/tooltip";
import type { ReactNode } from "react";

export const TOOLTIP_CLASS =
  "origin-(--transform-origin) max-w-64 rounded-md border border-border bg-popover px-2 py-1 text-caption text-popover-foreground shadow-popover transition-[opacity,scale] duration-125 ease-out data-ending-style:scale-97 data-ending-style:opacity-0 data-instant:duration-0 data-starting-style:scale-97 data-starting-style:opacity-0 motion-reduce:transition-none";

/** Short text-only hint. Base UI: opens on hover and focus, Esc closes; neighbours open without delay. */
export function Hint({
  children,
  content,
  side = "top",
}: {
  children: ReactNode;
  content: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
}) {
  return (
    <Tooltip.Root>
      {children}
      <Tooltip.Portal>
        <Tooltip.Positioner className="z-50" side={side} sideOffset={6}>
          <Tooltip.Popup className={TOOLTIP_CLASS}>{content}</Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

export const HintTrigger = Tooltip.Trigger;
export const HintProvider = Tooltip.Provider;
