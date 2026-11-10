"use client";

import { Bell, Search, type LucideIcon } from "lucide-react";
import { useEffect, useEffectEvent, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Top bar of the page: icon + title on the left; "Search… ⌘K" and the bell on the right.
 * ⌘K/Ctrl+K calls `onSearch` from anywhere on the page. Without `onSearch`, the search is hidden.
 */
export function PageHeader({
  actions,
  className,
  icon: Icon,
  notifications,
  onNotifications,
  onSearch,
  title,
  titleAs: TitleTag = "h1",
}: {
  actions?: ReactNode;
  className?: string;
  icon?: LucideIcon;
  /** Unread notifications; 0 hides the dot. */
  notifications?: number;
  onNotifications?: () => void;
  onSearch?: () => void;
  title: string;
  /** "p" when the page already has another h1 (for example the dashboard greeting). */
  titleAs?: "h1" | "p";
}) {
  const searchEnabled = onSearch !== undefined;
  const openSearch = useEffectEvent(() => onSearch?.());

  useEffect(() => {
    if (!searchEnabled) return undefined;

    function handleKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openSearch();
      }
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [searchEnabled]);

  const unread = notifications ?? 0;

  return (
    <header
      className={cn(
        "flex flex-wrap items-center gap-3 border-b border-border pb-4 sm:flex-nowrap",
        className,
      )}
    >
      {/* At least one control tall (32 px): with or without a button on the right, same height. */}
      <div className="flex min-h-control min-w-0 flex-1 items-center gap-3">
        {Icon !== undefined ? (
          <Icon
            aria-hidden="true"
            className="size-5 shrink-0 text-muted-foreground"
            strokeWidth={1.75}
          />
        ) : null}
        <TitleTag className="truncate text-title">{title}</TitleTag>
      </div>
      <div className="flex items-center gap-2">
        {actions}
        {onSearch !== undefined ? (
          <button
            aria-keyshortcuts="Meta+K Control+K"
            className="flex h-control w-full min-w-0 items-center gap-2 rounded-[0.625rem] border border-border-strong bg-card px-3 text-body text-muted-foreground shadow-card outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 sm:w-64"
            onClick={onSearch}
            type="button"
          >
            <Search aria-hidden="true" className="size-4 shrink-0" />
            <span className="flex-1 truncate text-left">Search…</span>
            <kbd className="hidden rounded border border-border bg-muted px-1.5 font-sans text-caption sm:inline">
              ⌘K
            </kbd>
          </button>
        ) : null}
        {onNotifications !== undefined ? (
          <button
            aria-label={unread > 0 ? `Notifications: ${unread} unread` : "Notifications"}
            className="relative flex size-control shrink-0 items-center justify-center rounded-[0.625rem] border border-border-strong bg-card text-foreground shadow-card outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
            onClick={onNotifications}
            type="button"
          >
            <Bell aria-hidden="true" className="size-4" strokeWidth={1.75} />
            {unread > 0 ? (
              <span
                aria-hidden="true"
                className="absolute top-1.5 right-1.5 size-2 rounded-full bg-ai-mark ring-2 ring-card"
              />
            ) : null}
          </button>
        ) : null}
      </div>
    </header>
  );
}
