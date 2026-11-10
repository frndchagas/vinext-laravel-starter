import { Sparkles } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { formatPercent } from "./format";
import { pillClass } from "./pill";

/** Confidence bands: below 70% an automatic classification becomes a question for the person. */
export function confidenceBand(confidence: number): "high" | "medium" | "low" {
  if (confidence >= 0.85) return "high";
  if (confidence >= 0.7) return "medium";
  return "low";
}

/**
 * AI authorship in lists and tables ("Filed by AI"): gray pill with the small violet icon. Together
 * with the violet stroke on the left edge of cards (see `AlertCard`), it is the only AI mark.
 */
export function AiBadge({
  children = "AI",
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <span className={cn(pillClass, "text-foreground", className)}>
      <Sparkles aria-hidden="true" className="size-3 shrink-0 text-ai-ink" strokeWidth={2} />
      {children}
    </span>
  );
}

/** Confidence: thin violet bar plus the percentage in text (never the bar alone). */
export function ConfidenceMeter({ confidence }: { confidence: number }) {
  const clamped = Math.min(Math.max(confidence, 0), 1);
  const band = confidenceBand(clamped);

  return (
    <div className="flex items-center gap-2">
      <meter
        aria-label="Confidence"
        className="sr-only"
        high={0.85}
        low={0.7}
        max={1}
        min={0}
        optimum={1}
        value={clamped}
      />
      <span aria-hidden="true" className="h-1 w-16 overflow-hidden rounded-full bg-muted">
        <span
          className="block h-full rounded-full bg-ai-mark"
          style={{ width: `${clamped * 100}%` }}
        />
      </span>
      <span className="text-caption text-muted-foreground tabular-nums">
        {band} confidence, {formatPercent(clamped)}
      </span>
    </div>
  );
}
