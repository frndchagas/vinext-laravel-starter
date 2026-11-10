"use client";

import { type ReactNode, useSyncExternalStore } from "react";

import { cn } from "@/lib/utils";

const subscribeNothing = () => () => {};
const readClockHour = () => new Date().getHours();
const readNoHour = () => undefined;

/** "Good morning" until 11:59, "Good afternoon" until 17:59, "Good evening" after that. */
export function salutationFor(hour: number): "Good morning" | "Good afternoon" | "Good evening" {
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 18) return "Good afternoon";
  return "Good evening";
}

/** Number or fact highlighted inside the summary sentence (strong ink, medium weight). */
export function Highlight({ children }: { children: ReactNode }) {
  return <strong className="font-medium text-foreground tabular-nums">{children}</strong>;
}

/**
 * Salutation ("Good morning, Fernando!") plus a summary sentence with the day's numbers highlighted.
 * The hour comes from the browser clock after hydration; before that, "Hello" (server and client
 * may be in different time zones). Pass `hour` to pin it (tests, showcase).
 */
export function Greeting({
  actions,
  as: Heading = "h2",
  className,
  hour,
  name,
  summary,
}: {
  actions?: ReactNode;
  /** h1 when the page has no PageHeader with a title; h3 inside sections (showcase). */
  as?: "h1" | "h2" | "h3";
  className?: string;
  hour?: number;
  name: string;
  summary?: ReactNode;
}) {
  // The browser clock is read only on the client, after hydration: server and client render "Hello".
  const clockHour = useSyncExternalStore(subscribeNothing, readClockHour, readNoHour);
  const resolved = hour ?? clockHour;
  const salutation = resolved === undefined ? "Hello" : salutationFor(resolved);

  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        <Heading className="text-display">
          {salutation}, {name}!
        </Heading>
        {summary !== undefined ? (
          <p className="mt-1 text-body text-pretty text-muted-foreground">{summary}</p>
        ) : null}
      </div>
      {actions !== undefined ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
