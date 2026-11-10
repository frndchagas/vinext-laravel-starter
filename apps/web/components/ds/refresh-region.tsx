import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/**
 * Region whose data changes when a filter, tab or period changes. While the new query runs
 * (`busy`), the previous data stays in place at 60% with `aria-busy`, and a thin bar runs along the
 * top; the swap happens at once when the new data arrives. The skeleton is only for the first load,
 * when there is no data yet.
 *
 * - Dims only after 150 ms (fast responses do not flicker) and returns without a transition: in the
 *   middle of an opacity animation, gray text failed axe's contrast check.
 * - The bar is decorative; with `prefers-reduced-motion` it stays still, without sliding.
 * - `announcement`: sentence read (`aria-live="polite"`) when the results arrive. Omit it when the
 *   region already announces on its own.
 */
export function RefreshRegion({
  announcement,
  bar = true,
  busy,
  children,
  className,
  ...props
}: Omit<ComponentProps<"div">, "aria-busy"> & {
  /** A new query is on its way, with the previous data on screen (`isPlaceholderData`). */
  busy: boolean;
  /** Progress bar at the top of the region; turn it off on small bands (totals, titles). */
  bar?: boolean;
  announcement?: string;
}) {
  return (
    <div
      {...props}
      aria-busy={busy}
      className={cn(
        "relative",
        busy &&
          "[&>:not([data-refresh-bar])]:opacity-60 [&>:not([data-refresh-bar])]:[transition:opacity_0s_150ms]",
        className,
      )}
      data-refreshing={busy ? "" : undefined}
    >
      {busy && bar ? <RefreshBar /> : null}
      {children}
      {announcement === undefined ? null : (
        <output aria-live="polite" className="sr-only">
          {busy ? "" : announcement}
        </output>
      )}
    </div>
  );
}

/** Thin indeterminate bar at the top of the region that refreshes (appears after 200 ms). */
export function RefreshBar({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-x-0 top-0 z-10 h-0.5 animate-refresh-in overflow-hidden rounded-t-[inherit]",
        className,
      )}
      data-refresh-bar=""
    >
      <span className="block h-full w-1/3 animate-refresh-bar rounded-full bg-primary motion-reduce:w-full motion-reduce:animate-none motion-reduce:opacity-40" />
    </span>
  );
}
