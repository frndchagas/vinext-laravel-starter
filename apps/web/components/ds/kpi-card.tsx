import { ChevronRight, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { IconTile } from "./card";
import { formatPercentPrecise } from "./format";
import { deltaTrend, type KpiCta, type KpiDelta, TREND_WORD } from "./kpi-strip";

export type { KpiCta };

export type KpiContextTone = "neutral" | "positive" | "negative" | "attention";

/** Context line: short pill + text ("−1.9%  vs September", "12/15  below the minimum"). */
export type KpiContext = {
  pill: ReactNode;
  text: ReactNode;
  tone: KpiContextTone;
  spoken?: string;
};

/** Gray pill; the color lives only in the number. */
const PILL_TONES = {
  attention: "text-attention",
  negative: "text-negative",
  neutral: "text-muted-foreground",
  positive: "text-positive",
} as const satisfies Record<KpiContextTone, string>;

/** Change vs the previous period, colored by what is good for the number. */
export function deltaContext(delta: KpiDelta): KpiContext {
  const trend = deltaTrend(delta);

  return {
    pill: formatPercentPrecise(delta.ratio),
    spoken: TREND_WORD[trend],
    text: delta.comparison,
    tone: trend === "good" ? "positive" : trend === "bad" ? "negative" : "neutral",
  };
}

/** Likely range of a projection ("10.7 to 18.6  likely range"). */
export function rangeContext(low: string, high: string, text = "likely range"): KpiContext {
  return { pill: `${low} to ${high}`, text, tone: "neutral" };
}

/** Role of the number: tints only the border and the sparkline (never the background). */
export type KpiAccent = "positive" | "negative" | "ai";

const ACCENTS = {
  ai: { border: "border-ai-mark/35", stroke: "var(--ai-mark)" },
  negative: { border: "border-negative/30", stroke: "var(--negative)" },
  positive: { border: "border-positive/35", stroke: "var(--positive)" },
} as const satisfies Record<KpiAccent, { border: string; stroke: string }>;

const SPARK_WIDTH = 96;
const SPARK_HEIGHT = 28;

/** Trend sparkline (decorative: the value and the change are in the text). */
function KpiSparkline({ color, values }: { color: string; values: number[] }) {
  if (values.length < 2) return null;

  const max = Math.max(...values);
  const min = Math.min(...values);
  const x = (index: number) => 2 + (index / (values.length - 1)) * (SPARK_WIDTH - 4);
  const y = (value: number) => 3 + ((max - value) / (max - min || 1)) * (SPARK_HEIGHT - 6);
  const path = values
    .map((value, index) => `${index === 0 ? "M" : "L"}${x(index)},${y(value)}`)
    .join(" ");
  const last = values[values.length - 1] ?? 0;

  return (
    <svg
      aria-hidden="true"
      className="shrink-0 overflow-visible"
      height={SPARK_HEIGHT}
      width={SPARK_WIDTH}
    >
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
      />
      <circle
        cx={x(values.length - 1)}
        cy={y(last)}
        fill={color}
        r={3}
        stroke="var(--card)"
        strokeWidth={1.5}
      />
    </svg>
  );
}

/**
 * Indicator in its own card: icon in a small square, label, large value and a context line with a
 * pill. Use in a grid of 2 to 4 columns; for several sibling numbers in a single card, use KpiStrip.
 */
export function KpiCard({
  accent,
  children,
  className,
  context,
  cta,
  icon,
  label,
  note,
  sparkline,
  value,
}: {
  /** With `sparkline`: the border and the line take the role's color. */
  accent?: KpiAccent;
  className?: string;
  context?: KpiContext;
  icon?: LucideIcon;
  label: string;
  sparkline?: number[];
  value: ReactNode;
  /** Context line without a pill ("19 invoices until 12/05"), when there is no change to show. */
  note?: ReactNode;
  /** End of the card: progress bar, supporting line. */
  children?: ReactNode;
  /**
   * Button in the footer. It is the card's only link and stretches over it (pseudo-element), so the
   * whole card leads to the same destination without a nested link; the rest is not interactive.
   */
  cta?: KpiCta | undefined;
}) {
  return (
    <section
      aria-label={label}
      className={cn(
        "flex min-w-0 flex-col gap-3 rounded-card border border-border bg-card p-card shadow-card",
        cta !== undefined &&
          "relative transition-colors hover:border-border-strong has-[a:focus-visible]:border-border-strong",
        accent !== undefined && ACCENTS[accent].border,
        className,
      )}
    >
      <p className="flex min-w-0 items-center gap-2.5 text-body text-muted-foreground">
        {icon !== undefined ? <IconTile icon={icon} size="sm" /> : null}
        <span className="truncate">{label}</span>
      </p>
      {/* The sparkline sits beside the number so the label keeps its space. */}
      <div className="flex min-w-0 items-end justify-between gap-3">
        <p className="min-w-0 text-kpi figure font-semibold">{value}</p>
        {sparkline !== undefined ? (
          <KpiSparkline
            color={accent !== undefined ? ACCENTS[accent].stroke : "var(--chart-muted)"}
            values={sparkline}
          />
        ) : null}
      </div>
      {context !== undefined ? (
        <p className="flex flex-wrap items-center gap-2 text-label text-muted-foreground">
          <span
            className={cn(
              "inline-flex items-center rounded-full bg-pill px-2 py-[3px] font-medium tabular-nums",
              PILL_TONES[context.tone],
            )}
          >
            {context.pill}
            {context.spoken !== undefined ? (
              <span className="sr-only">, {context.spoken}</span>
            ) : null}
          </span>
          <span>{context.text}</span>
        </p>
      ) : null}
      {note !== undefined ? <div className="text-label text-muted-foreground">{note}</div> : null}
      {children}
      {cta !== undefined ? (
        <div className="mt-auto pt-1">
          <Link
            aria-label={cta.ariaLabel}
            className={cn(
              buttonVariants({ size: "sm", variant: "outline" }),
              "after:absolute after:inset-0 after:rounded-card after:content-['']",
            )}
            href={cta.href}
          >
            {cta.label}
            <ChevronRight aria-hidden="true" data-icon="inline-end" />
          </Link>
        </div>
      ) : null}
    </section>
  );
}
