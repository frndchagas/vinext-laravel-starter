import { Check, Sparkles, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Timeline of events (activity, to-do): icon in a circle linked to the next by a vertical line;
 * sentence "actor + verb + chip · time"; nested content in a card.
 */
export function Feed({
  ariaLabel,
  children,
  className,
}: {
  ariaLabel: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <ol aria-label={ariaLabel} className={cn("flex flex-col", className)}>
      {children}
    </ol>
  );
}

/** Period selector followed by a line across the column ("Today ⌄ ———"). */
export function FeedPeriod({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center gap-4 pb-5", className)}>
      <div className="shrink-0">{children}</div>
      <span aria-hidden="true" className="h-px flex-1 bg-border" />
    </div>
  );
}

/** Object of the sentence in an outlined chip ("a [question]", "the [statement]"). */
export function FeedChip({ children, icon: Icon }: { children: ReactNode; icon?: LucideIcon }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border-strong bg-card px-2 py-px align-middle text-label font-medium text-foreground">
      {Icon !== undefined ? (
        <Icon aria-hidden="true" className="size-3.5 text-muted-foreground" />
      ) : null}
      {children}
    </span>
  );
}

export type FeedVariant = "default" | "ai" | "done";

/** Always a white circle with a border; only the icon changes color (violet for AI, neutral gray when done). */
const ICON_COLOR = {
  ai: "text-ai-ink",
  default: "text-foreground",
  done: "text-muted-foreground",
} as const satisfies Record<FeedVariant, string>;

/**
 * One event. `variant="ai"` marks what the AI did or asked (violet icon and thin violet stroke on
 * the left edge of the content); `variant="done"` is the completion event (neutral gray check). The
 * last item draws no connector. `contentClassName` goes on the content card (for example
 * `ALERT_FRAME_MEASURE`, so the card ends at the measure of a `plain` `AlertCard`); the event line
 * keeps the column width.
 */
export function FeedItem({
  actor,
  children,
  contentClassName,
  icon,
  object,
  time,
  timeLabel,
  variant = "default",
  verb,
}: {
  actor: ReactNode;
  children?: ReactNode;
  contentClassName?: string | undefined;
  icon?: LucideIcon;
  object?: ReactNode;
  /** ISO date/time for <time dateTime>. */
  time: string;
  /** Visible text of the time ("9:41", "yesterday"). */
  timeLabel: string;
  variant?: FeedVariant;
  verb: ReactNode;
}) {
  const Icon = icon ?? (variant === "ai" ? Sparkles : variant === "done" ? Check : undefined);

  return (
    <li className="group/feed relative grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-3 pb-6 last:pb-0 sm:grid-cols-[2.5rem_minmax(0,1fr)] sm:gap-x-4">
      <span
        aria-hidden="true"
        className="absolute top-11 bottom-2 left-[1.125rem] w-px bg-border group-last/feed:hidden sm:top-12 sm:left-5"
      />
      <span
        aria-hidden="true"
        className="flex size-9 items-center justify-center rounded-full border border-border-strong bg-card sm:size-10"
      >
        {Icon !== undefined ? (
          <Icon className={cn("size-4", ICON_COLOR[variant])} strokeWidth={1.75} />
        ) : null}
      </span>
      <div className="flex min-w-0 flex-col gap-2.5 pt-1.5 sm:pt-2">
        {/*
          Running text (not flex) so it wraps between words. The time closes the sentence
          ("… gap · 11/04"). With an object, the chip and "· 11/04" share one `whitespace-nowrap`
          span (the chip is inline-flex and the browser breaks beside it even with a non-breaking
          space): on phones, "gap · 11/04" drops together, never leaving the date alone or opening a
          line with "·". Without an object, the non-breaking space glues the time to the verb's last word.
        */}
        <p className="text-body leading-6">
          <span className="font-semibold text-foreground">{actor}</span>{" "}
          <span className="text-muted-foreground">{verb}</span>
          {object !== undefined ? (
            <>
              {" "}
              {timeLabel !== "" ? (
                <span className="whitespace-nowrap" data-feed-tail="">
                  {object}
                  {" "}
                  <FeedTime time={time} timeLabel={timeLabel} />
                </span>
              ) : (
                object
              )}
            </>
          ) : timeLabel !== "" ? (
            <>
              {" "}
              <FeedTime time={time} timeLabel={timeLabel} />
            </>
          ) : null}
        </p>
        {children !== undefined ? (
          <div
            className={cn(
              "relative rounded-card border border-border bg-card p-4 shadow-card",
              contentClassName,
            )}
            data-feed-content=""
          >
            {variant === "ai" ? (
              <span
                aria-hidden="true"
                className="absolute top-4 bottom-4 left-0 w-0.5 rounded-full bg-ai-mark"
                data-origin-mark=""
              />
            ) : null}
            {children}
          </div>
        ) : null}
      </div>
    </li>
  );
}

/** "· 11/04" at the end of the metadata line, with no break between the dot and the date. */
function FeedTime({ time, timeLabel }: { time: string; timeLabel: string }) {
  return (
    <span className="whitespace-nowrap text-muted-foreground">
      <span aria-hidden="true">·</span>{" "}
      <time className="text-label tabular-nums" data-feed-time="" dateTime={time}>
        {timeLabel}
      </time>
    </span>
  );
}

/**
 * Task inside an event. Done: white circle with border and check, text struck through.
 * The state is said in text ("done") so it does not depend on the strike or the color.
 */
export function FeedTask({
  children,
  done = false,
  meta,
}: {
  children: ReactNode;
  done?: boolean;
  meta?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span
        aria-hidden="true"
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-full border bg-card",
          done
            ? "border-border-strong text-muted-foreground"
            : "border-dashed border-border-strong text-transparent",
        )}
      >
        <Check className="size-3.5" strokeWidth={2.25} />
      </span>
      <span
        className={cn(
          "min-w-0 text-body font-medium",
          done && "text-muted-foreground line-through",
        )}
      >
        {children}
        {done ? <span className="sr-only"> (done)</span> : null}
      </span>
      {meta !== undefined ? <span className="flex items-center gap-1.5">{meta}</span> : null}
    </div>
  );
}
