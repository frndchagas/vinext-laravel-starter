import { ArrowDownRight, ArrowUpRight, ChevronRight, Minus, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { formatPercentPrecise } from "./format";

export type KpiDelta = {
  /** Relative change (0.2 = +20%). */
  ratio: number;
  /** Absolute detail, already formatted, shown in parentheses ("$2,423"). */
  detail?: string;
  /** Baseline of the comparison ("vs Oct 2026"). */
  comparison: string;
  /** For costs and delays, going up is bad. */
  polarity?: "up-is-good" | "down-is-good";
};

/** Action of an indicator: a verb ("View users") and the destination; the whole indicator leads to it. */
export type KpiCta = { label: string; href: string; ariaLabel?: string | undefined };

export type KpiItem = {
  key: string;
  label: string;
  icon?: LucideIcon;
  value: ReactNode;
  delta?: KpiDelta;
  /** Supporting line when there is no change to show ("3 overdue contracts"). */
  note?: ReactNode;
  /**
   * Verb in the item's footer. It is the item's only link and stretches over it (pseudo-element),
   * like in `KpiCard`: the whole item leads to the destination, without a nested link.
   */
  cta?: KpiCta | undefined;
};

type Trend = "good" | "bad" | "flat";

export function deltaTrend(delta: KpiDelta): Trend {
  if (delta.ratio === 0) return "flat";
  const up = delta.ratio > 0;
  const upIsGood = (delta.polarity ?? "up-is-good") === "up-is-good";

  return up === upIsGood ? "good" : "bad";
}

const TREND_CLASS = {
  bad: "text-negative",
  flat: "text-muted-foreground",
  good: "text-positive",
} as const satisfies Record<Trend, string>;

export const TREND_WORD = {
  bad: "worse",
  flat: "stable",
  good: "better",
} as const satisfies Record<Trend, string>;

function DeltaLine({ delta }: { delta: KpiDelta }) {
  const trend = deltaTrend(delta);
  const Icon = delta.ratio > 0 ? ArrowUpRight : delta.ratio < 0 ? ArrowDownRight : Minus;
  const percent = formatPercentPrecise(delta.ratio);

  return (
    <p className="flex flex-wrap items-center gap-x-1.5 text-label">
      <span
        className={cn(
          // Percentage and value together: "−19.4% (−$11,798.63)" wraps as a whole, never in the middle.
          "inline-flex items-center gap-0.5 font-medium whitespace-nowrap tabular-nums",
          TREND_CLASS[trend],
        )}
      >
        <Icon aria-hidden="true" className="size-3.5" />
        {percent}
        {delta.detail !== undefined ? ` (${delta.detail})` : null}
        <span className="sr-only">, {TREND_WORD[trend]}</span>
      </span>
      <span className="text-muted-foreground">{delta.comparison}</span>
    </p>
  );
}

/**
 * Place of each item in the two-column phone grid (`mobileGrid`): the last one takes the full width
 * and, if one item is left alone before it, that one too (no hole in the grid). Says where the
 * dividers go: vertical between the pair, horizontal from the second row on.
 */
export function mobileGridCells(
  count: number,
): ReadonlyArray<{ span: boolean; right: boolean; top: boolean }> {
  const cells: { span: boolean; right: boolean; top: boolean }[] = [];
  let row = 0;
  let column = 0;
  const pairable = count - 1;
  for (let index = 0; index < count; index += 1) {
    const span = index === count - 1 || (pairable % 2 === 1 && index === pairable - 1);
    if (span && column === 1) {
      row += 1;
      column = 0;
    }
    cells.push({ right: !span && column === 0, span, top: row > 0 });
    if (span || column === 1) {
      row += 1;
      column = 0;
    } else {
      column = 1;
    }
  }
  return cells;
}

/**
 * Strip of indicators in a single card, separated by vertical dividers (horizontal on phones).
 * Each item: label with icon, large value and a change colored by what is good for that number.
 * Below `sm`, one item per line; the value and the pair "−19.4% (−$11,798.63)" never break in the
 * middle. With `mobileGrid`, below `sm` the items go in two columns with less padding and the last
 * one full width (short dates that fit half the width). With `wrap`, from `lg` the items wrap onto
 * more rows when they do not fit (each at least 10rem, growing to fill the row) instead of
 * squeezing six or seven into one line; each item keeps its top and left dividers, and the ones at
 * the card's edge are clipped away.
 */
export function KpiStrip({
  ariaLabel,
  className,
  items,
  mobileGrid = false,
  wrap = false,
}: {
  ariaLabel: string;
  className?: string;
  items: KpiItem[];
  mobileGrid?: boolean;
  wrap?: boolean;
}) {
  const cells = mobileGrid ? mobileGridCells(items.length) : [];
  const linked = items.some((item) => item.cta !== undefined);

  return (
    <section
      aria-label={ariaLabel}
      className={cn(
        "rounded-card border border-border bg-card shadow-card",
        // The clip hides the dividers of the first column and first row (`wrap`) and, with
        // clickable items, keeps the hover background and focus ring inside the corners.
        wrap && "lg:overflow-hidden",
        linked && "overflow-hidden",
        className,
      )}
    >
      <dl
        className={cn(
          "grid sm:grid-cols-2 sm:divide-y-0 lg:flex",
          mobileGrid ? "grid-cols-2" : "grid-cols-1 divide-y divide-border",
          wrap && "lg:-mt-px lg:-ml-px lg:flex-wrap",
        )}
      >
        {items.map((item, index) => {
          const Icon = item.icon;
          const cell = cells[index];

          return (
            <div
              className={cn(
                "flex min-w-0 flex-1 flex-col gap-3 p-card",
                // In two columns, the vertical divider sits only between the pair and the horizontal between rows.
                "border-border sm:odd:border-r lg:border-l lg:odd:border-r-0",
                // Without `wrap`, a single line: no divider before the first nor on top.
                wrap ? "lg:basis-40 lg:border-t" : "lg:first:border-l-0",
                index >= 2 && "sm:border-t",
                index >= 2 && !wrap && "lg:border-t-0",
                cell !== undefined && "max-sm:gap-2 max-sm:p-4",
                cell?.span === true && "max-sm:col-span-2",
                cell?.right === true && "max-sm:border-r",
                cell?.top === true && "max-sm:border-t",
                item.cta !== undefined &&
                  "relative transition-colors hover:bg-muted/50 has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-ring has-[a:focus-visible]:ring-inset",
              )}
              key={item.key}
            >
              <dt className="flex items-center gap-2 text-body text-muted-foreground">
                {Icon !== undefined ? (
                  <Icon aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.75} />
                ) : null}
                <span className="truncate">{item.label}</span>
              </dt>
              <dd className={cn("flex flex-col gap-2", item.cta !== undefined && "flex-1")}>
                {/* `div`: the value may be a small list, not only a number. */}
                <div className="text-kpi figure font-semibold whitespace-nowrap">{item.value}</div>
                {item.delta !== undefined ? <DeltaLine delta={item.delta} /> : null}
                {item.note !== undefined ? (
                  <span className="text-label text-muted-foreground">{item.note}</span>
                ) : null}
                {/* Inside the `dd`: a `dl` only accepts `dt` and `dd` in each group. */}
                {item.cta !== undefined ? (
                  <Link
                    aria-label={item.cta.ariaLabel}
                    className={cn(
                      buttonVariants({ size: "sm", variant: "ghost" }),
                      "mt-auto -mb-1.5 -ml-2.5 self-start focus-visible:ring-0",
                      "after:absolute after:inset-0 after:content-['']",
                    )}
                    href={item.cta.href}
                  >
                    {item.cta.label}
                    <ChevronRight aria-hidden="true" data-icon="inline-end" />
                  </Link>
                ) : null}
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
