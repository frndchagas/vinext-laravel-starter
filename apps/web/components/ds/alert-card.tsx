import { useId, type ReactNode } from "react";

import { cn } from "@/lib/utils";

import { ConfidenceMeter } from "./ai-mark";
import { Disclosure } from "./disclosure";

/**
 * Alert or proposal that asks for a decision (alerts on the dashboard, questions in a to-do feed).
 *
 * Approved shape (docs/design-system.md, "Voice and text"): `title` with the fact and the date;
 * `reason` with the numbers; optional `chart` (for example a `ForecastSparkline`); `actions` with
 * action verbs. No "AI suggestion" labels: when AI is the origin (`origin="ai"`), the card only gets
 * a thin violet stroke on its left edge, and the detailed reasoning (`details`) opens under
 * "Show calculation". `variant="plain"` drops the frame and the stroke to sit inside a container
 * that already has them (for example an AI `FeedItem`). `titleSize="body"` writes the title in body
 * text (13 px, regular weight, ink) for long questions that would outweigh the page title in
 * `text-heading`. In `plain` (wide feed card), title, reason and actions share the same reading
 * measure (`ALERT_MEASURE`, 70ch) so a question never runs ~150 characters on one line and the
 * buttons wrap at the text's width. The framed card already lives in narrow columns and takes no
 * measure.
 */
export const ALERT_MEASURE = "max-w-[70ch]";

/**
 * Width of the outer frame (the `FeedItem` card) that hosts a `plain` `AlertCard`: the 70ch measure
 * plus the `p-4` and the 1 px border on both sides, so the border ends where the text and the
 * actions end instead of running the whole page with an empty right side. On phones the available
 * width is smaller and the limit does not kick in.
 */
export const ALERT_FRAME_MEASURE = "max-w-[calc(70ch+2rem+2px)]";

export function AlertCard({
  actions,
  chart,
  className,
  confidence,
  details,
  detailsLabel = "Show calculation",
  onDetailsToggle,
  origin = "system",
  reason,
  title,
  titleSize = "heading",
  variant = "card",
}: {
  actions?: ReactNode;
  chart?: ReactNode;
  className?: string | undefined;
  confidence?: number;
  details?: ReactNode;
  detailsLabel?: string;
  /** Fires when the details open or close (for example to load them only when open). */
  onDetailsToggle?: (open: boolean) => void;
  origin?: "ai" | "system";
  reason?: ReactNode;
  title: ReactNode;
  titleSize?: "heading" | "body";
  variant?: "card" | "plain";
}) {
  const titleId = useId();
  const framed = variant === "card";
  const measure = framed ? undefined : ALERT_MEASURE;

  return (
    <article
      aria-labelledby={titleId}
      className={cn(
        "relative flex flex-col gap-3",
        framed && "rounded-card border border-border bg-card p-4 shadow-card",
        framed && origin === "ai" && "pl-5",
        className,
      )}
    >
      {framed && origin === "ai" ? (
        <span
          aria-hidden="true"
          className="absolute top-4 bottom-4 left-0 w-0.5 rounded-full bg-ai-mark"
          data-origin-mark=""
        />
      ) : null}
      <div className={cn("flex flex-col gap-1", measure)} data-alert-measure="">
        <h3
          className={cn(
            "text-pretty",
            titleSize === "body" ? "text-body font-normal text-foreground" : "text-heading",
          )}
          id={titleId}
        >
          {title}
        </h3>
        {reason !== undefined ? (
          <p className="text-body text-pretty text-muted-foreground">{reason}</p>
        ) : null}
      </div>
      {chart}
      {confidence !== undefined ? <ConfidenceMeter confidence={confidence} /> : null}
      {actions !== undefined ? (
        <div className={cn("flex flex-wrap gap-2", measure)} data-alert-actions="">
          {actions}
        </div>
      ) : null}
      {details !== undefined ? (
        <Disclosure
          contentClassName="text-muted-foreground"
          label={detailsLabel}
          onToggle={onDetailsToggle}
        >
          {details}
        </Disclosure>
      ) : null}
    </article>
  );
}
