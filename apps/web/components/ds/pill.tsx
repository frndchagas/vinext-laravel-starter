import { CircleCheck, Sparkles, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type PillTone = "neutral" | "positive" | "negative" | "attention" | "ai" | "outline";

/**
 * One gray background and neutral text; the state color lives only in the dot (or the icon).
 * Colored text over gray read as a tinted pill. Positive has no color: a check in a neutral gray
 * circle (green is reserved for positive numbers).
 */
const TEXT = {
  ai: "text-foreground",
  attention: "text-foreground",
  negative: "text-foreground",
  neutral: "text-muted-foreground",
  outline: "text-foreground",
  positive: "text-foreground",
} as const satisfies Record<PillTone, string>;

const DOT = {
  ai: "bg-ai-mark",
  attention: "bg-attention-mark",
  negative: "bg-negative",
  neutral: undefined,
  outline: undefined,
  positive: undefined,
} as const satisfies Record<PillTone, string | undefined>;

const ICON = {
  ai: "text-ai-ink",
  attention: "text-attention",
  negative: "text-negative",
  neutral: "text-muted-foreground",
  outline: "text-muted-foreground",
  positive: "text-muted-foreground",
} as const satisfies Record<PillTone, string>;

/** Base class of pills: light gray, no border, height follows the density. */
export const pillClass =
  "inline-flex items-center gap-1.5 rounded-full bg-pill px-2 py-[3px] text-caption font-medium whitespace-nowrap";

/**
 * Short state ("Scheduled", "● Overdue 12 days"). Always gray background and neutral text; the color
 * shows only in the dot (or the icon, when there is one). `tone="ai"` uses the small violet icon in
 * place of the dot; `tone="positive"` ("Done", "Active", "Paid") the neutral gray check.
 */
export function StatusPill({
  children,
  className,
  dot: neutralDot = false,
  icon,
  tone = "neutral",
}: {
  children: ReactNode;
  className?: string;
  /** Gray dot in the neutral tone, for exceptions without a state color ("● Disabled", "● Manual"). */
  dot?: boolean;
  icon?: LucideIcon;
  tone?: PillTone;
}) {
  const Icon = icon ?? (tone === "ai" ? Sparkles : tone === "positive" ? CircleCheck : undefined);
  const dot = DOT[tone] ?? (neutralDot ? "bg-subtle-foreground" : undefined);

  return (
    <span
      className={cn(
        pillClass,
        tone === "outline" && "border border-border-strong bg-card",
        TEXT[tone],
        className,
      )}
    >
      {Icon !== undefined ? (
        <Icon aria-hidden="true" className={cn("size-3 shrink-0", ICON[tone])} strokeWidth={2} />
      ) : dot !== undefined ? (
        <span aria-hidden="true" className={cn("size-1.5 shrink-0 rounded-full", dot)} />
      ) : null}
      {children}
    </span>
  );
}

/**
 * Counter in a pill (tabs, navigation). `label` completes the reading for screen readers:
 * "4" becomes "4 open questions". `tone="ai"` paints only the number violet.
 */
export function CountPill({
  className,
  count,
  label,
  tone = "neutral",
}: {
  className?: string;
  count: number;
  label?: string;
  tone?: "neutral" | "strong" | "ai";
}) {
  return (
    <span
      className={cn(
        "inline-flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full px-1.5 text-caption font-semibold tabular-nums",
        tone === "neutral" && "bg-pill text-muted-foreground",
        tone === "strong" && "bg-foreground text-background",
        tone === "ai" && "bg-pill text-ai-ink",
        className,
      )}
    >
      {count}
      {label !== undefined ? <span className="sr-only"> {label}</span> : null}
    </span>
  );
}
