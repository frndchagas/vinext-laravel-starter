import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { HoldNavigationProgress } from "./hold-navigation-progress";
import { Skeleton } from "./skeleton";

/**
 * Skeleton of a whole route, for each page's `loading.tsx`: shows the instant of the click, before
 * the route responds (Vinext mounts the `loading.tsx` prefetched by the <Link> while the real route
 * loads). Header with the page's real title (the same as the `PageHeader`, without the actions) and
 * the main blocks in gray, where the page draws its own, so nothing jumps when it arrives. While on
 * screen, it holds the top navigation bar. Announces "Loading …" once (`aria-busy` + `<output>`).
 *
 * Deliberately light: only markup and `Skeleton`, no data or hooks (server component).
 * See "Loading and pending" in docs/design-system.md.
 */
export function RouteSkeleton({
  children,
  icon: Icon,
  label,
  title,
}: {
  children: ReactNode;
  icon?: LucideIcon;
  /** What is loading, for the screen reader: "Loading users". */
  label: string;
  /** Page title; without it (a title that depends on data), the header is gray too. */
  title?: string;
}) {
  return (
    <div aria-busy="true" className="flex min-w-0 flex-col gap-6" data-route-skeleton="">
      <HoldNavigationProgress />
      <output className="sr-only">Loading {label}</output>
      <header className="flex items-center gap-3 border-b border-border pb-4">
        <div className="flex min-h-control min-w-0 flex-1 items-center gap-3">
          {Icon !== undefined ? (
            <Icon
              aria-hidden="true"
              className="size-5 shrink-0 text-muted-foreground"
              strokeWidth={1.75}
            />
          ) : null}
          {title !== undefined ? (
            <p className="truncate text-title">{title}</p>
          ) : (
            <Skeleton className="h-6 w-56 max-w-full" />
          )}
        </div>
      </header>
      {children}
    </div>
  );
}

/** White card with a gray title line and a block the height of the content. */
export function SkeletonCard({
  className,
  height = "h-48",
}: {
  className?: string;
  /** Body height (`h-64`, `h-28`…). */
  height?: string;
}) {
  return (
    <div className={cn("rounded-card border border-border bg-card p-card shadow-card", className)}>
      <Skeleton className="mb-4 h-5 w-48 max-w-full" />
      <Skeleton className={cn(height, "w-full")} />
    </div>
  );
}

/** Strip of number cards (KPIs) at the top of several pages. */
export function SkeletonKpis({ count = 3 }: { count?: 2 | 3 | 4 }) {
  return (
    <div
      className={cn(
        "grid gap-stack sm:grid-cols-2",
        count === 3 && "lg:grid-cols-3",
        count === 4 && "xl:grid-cols-4",
      )}
    >
      {Array.from({ length: count }, (_, index) => (
        <div
          className="flex flex-col gap-3 rounded-card border border-border bg-card p-card shadow-card"
          key={index}
        >
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-40 max-w-full" />
          <Skeleton className="h-3 w-full" />
        </div>
      ))}
    </div>
  );
}

const ROW_WIDTHS = ["w-40", "w-56", "w-32", "w-48", "w-36", "w-52"] as const;

/** List or table in a card: rows the height of a table row (`h-row`). */
export function SkeletonRows({ rows = 8 }: { rows?: number }) {
  return (
    <div className="flex flex-col rounded-card border border-border bg-card px-card py-2 shadow-card">
      {Array.from({ length: rows }, (_, index) => (
        <div
          className="flex h-row items-center gap-4 border-b border-border last:border-b-0"
          key={index}
        >
          <Skeleton className="size-6 shrink-0 rounded-full" />
          <Skeleton className={cn("h-3", ROW_WIDTHS[index % ROW_WIDTHS.length])} />
          <Skeleton className="ml-auto h-3 w-20" />
        </div>
      ))}
    </div>
  );
}
