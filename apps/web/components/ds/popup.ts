/**
 * Shared look of Base UI popups (menus, popovers, calendars): raised card with the popover shadow
 * and a short scale/opacity transition that respects `prefers-reduced-motion`.
 */
export const POPUP_CLASS =
  "origin-(--transform-origin) rounded-xl border border-border bg-popover text-popover-foreground shadow-popover outline-none transition-[opacity,scale] duration-150 ease-out data-ending-style:scale-97 data-ending-style:opacity-0 data-starting-style:scale-97 data-starting-style:opacity-0 motion-reduce:transition-none";
