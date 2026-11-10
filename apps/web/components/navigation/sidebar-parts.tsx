"use client";

import { LoaderCircle } from "lucide-react";
import Link, { useLinkStatus } from "next/link";
import { type ReactNode, useId } from "react";

import { Hint, HintTrigger } from "@/components/navigation/hint";
import { cn } from "@/lib/utils";

/**
 * Sidebar row: 32 px, gray icon, label in ink and, on the current page's item, the subtle gray pill
 * (`sidebar-accent`) with medium weight. Collapsed, it becomes a 36 px square with the icon only and
 * the hint to the right; the label stays for screen readers.
 */
export const rowClass =
  "relative flex h-8 min-w-0 items-center gap-2.5 rounded-lg px-2 text-body text-sidebar-foreground outline-none hover:bg-sidebar-accent focus-visible:ring-3 focus-visible:ring-ring/50 aria-[current=page]:bg-sidebar-accent aria-[current=page]:font-medium has-data-nav-pending:bg-sidebar-accent";

export const railRowClass =
  "relative mx-auto grid size-9 place-items-center rounded-lg text-sidebar-foreground outline-none hover:bg-sidebar-accent focus-visible:ring-3 focus-visible:ring-ring/50 aria-[current=page]:bg-sidebar-accent has-data-nav-pending:bg-sidebar-accent";

/** 16 px icon in gray; on the active item, in ink. */
export const iconClass =
  "size-4 shrink-0 text-muted-foreground group-aria-[current=page]/row:text-foreground";

/**
 * Spinner on the clicked item, from the click until the new screen enters (`useLinkStatus` of the
 * surrounding <Link>): the menu responds at once, before the route. Open, it sits to the right of the
 * label; collapsed, in the corner of the icon. With `prefers-reduced-motion`, it stays still.
 * Decorative: the top bar and the route skeleton announce the loading.
 */
export function NavPendingIndicator({ collapsed = false }: { collapsed?: boolean }) {
  const { pending } = useLinkStatus();
  if (!pending) return null;

  return (
    <LoaderCircle
      aria-hidden="true"
      className={cn(
        "shrink-0 animate-spin text-muted-foreground motion-reduce:animate-none",
        collapsed ? "absolute right-0.5 bottom-0.5 size-3" : "size-3.5",
      )}
      data-nav-pending=""
      strokeWidth={2}
    />
  );
}

export function NavRow({
  active,
  collapsed,
  description,
  href,
  indicator = false,
  label,
  leading,
  onNavigate,
  tooltip,
  trailing,
}: {
  active: boolean;
  collapsed: boolean;
  /** Read after the name by screen readers ("4 open items"); the visible number stays hidden. */
  description?: string | undefined;
  href: string;
  /** Collapsed: dot in the corner of the icon when there is a counter. */
  indicator?: boolean;
  label: string;
  leading: ReactNode;
  onNavigate?: (() => void) | undefined;
  tooltip: string;
  trailing?: ReactNode;
}) {
  const descriptionId = useId();
  const shared = {
    "aria-current": active ? ("page" as const) : undefined,
    ...(description !== undefined ? { "aria-describedby": descriptionId } : {}),
    ...(onNavigate !== undefined ? { onClick: onNavigate } : {}),
  };
  const hiddenDescription =
    description === undefined ? null : (
      <span hidden id={descriptionId}>
        {description}
      </span>
    );

  if (collapsed) {
    return (
      <>
        <Hint content={tooltip} side="right">
          <HintTrigger
            className={cn("group/row", railRowClass)}
            render={<Link href={href} {...shared} />}
          >
            {leading}
            <span className="sr-only">{label}</span>
            <NavPendingIndicator collapsed />
            {indicator ? (
              <span
                aria-hidden="true"
                className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-muted-foreground"
                data-rail-indicator=""
              />
            ) : null}
          </HintTrigger>
        </Hint>
        {hiddenDescription}
      </>
    );
  }

  return (
    <>
      <Link className={cn("group/row", rowClass)} href={href} {...shared}>
        {leading}
        <span className="min-w-0 flex-1 truncate">{label}</span>
        <NavPendingIndicator />
        {trailing}
      </Link>
      {hiddenDescription}
    </>
  );
}

/**
 * Sidebar section with a small gray title ("General", "Admin") and an optional action on the right.
 * Collapsed, the title stays for screen readers only, the action disappears and a thin line
 * separates the sections.
 */
export function SidebarSection({
  action,
  children,
  collapsed,
  title,
}: {
  action?: ReactNode;
  children: ReactNode;
  collapsed: boolean;
  title: string;
}) {
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-0.5">
      {collapsed ? (
        <>
          <h2 className="sr-only" id={headingId}>
            {title}
          </h2>
          <span aria-hidden="true" className="mx-auto mb-1 h-px w-6 bg-sidebar-border" />
        </>
      ) : (
        <div className="flex h-7 items-center justify-between pr-1.5 pl-2">
          <h2 className="text-label font-medium text-muted-foreground" id={headingId}>
            {title}
          </h2>
          {action}
        </div>
      )}
      <ul className="flex flex-col gap-px">{children}</ul>
    </section>
  );
}
