"use client";

import { useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

import { formatPercent } from "../format";

export type DonutSegment = {
  key: string;
  label: string;
  value: number;
  color: string;
  /** Mark before the name in the legend (a category icon). */
  icon?: ReactNode;
};

const SIZE = 168;
const STROKE = 18;
/** 2 px gap between segments (the surface separates the colors). */
const GAP = 2;
export const DONUT_MAX_SEGMENTS = 5;

/** Categorical series for parts of a whole; the last one is the gray "Other". */
export const CHART_SERIES = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const;

/** Hero ramp (violet to pink) for the one hero chart of a page; "Other" = `--hero-other`. */
export const HERO_RAMP = [
  "var(--hero-cat-1)",
  "var(--hero-cat-2)",
  "var(--hero-cat-3)",
  "var(--hero-other)",
] as const;

/**
 * Donut for part-of-a-whole with up to 5 parts (more than that: sorted bars). Total in the center,
 * legend on the right with value and share, so color is never the only cue. Hover or focus on a
 * legend row highlights the segment.
 */
export function DonutChart({
  ariaLabel,
  centerLabel,
  centerValue,
  formatValue,
  legend = "right",
  maxSegments = DONUT_MAX_SEGMENTS,
  onSelect,
  segments,
  selectHint,
  size = SIZE,
}: {
  ariaLabel: string;
  /** "right": rows with % and value. "left": "Name = value" before the donut (two-part splits). */
  legend?: "right" | "left";
  centerLabel: string;
  centerValue: ReactNode;
  formatValue: (value: number) => string;
  segments: DonutSegment[];
  /** How many slices to draw; the caller groups the rest ("Other") beforehand. */
  maxSegments?: number;
  /** Click on the slice or the legend row (for example to open the category's items). */
  onSelect?: (segment: DonutSegment) => void;
  /** Complement read by the screen reader on each clickable row ("open the items"). */
  selectHint?: string;
  /** Diameter in px (168 by default; larger when the center carries a long exact value). */
  size?: number;
}) {
  const [active, setActive] = useState<string | null>(null);
  const radius = (size - STROKE) / 2;
  const circumference = 2 * Math.PI * radius;
  const visible = segments.slice(0, maxSegments);
  const total = visible.reduce((sum, segment) => sum + Math.max(segment.value, 0), 0);
  const offsets = visible.map((_, index) =>
    visible
      .slice(0, index)
      .reduce((sum, segment) => sum + (total === 0 ? 0 : Math.max(segment.value, 0) / total), 0),
  );

  return (
    // The donut responds to the card's width (container query), not the screen's.
    <div className="@container">
      <div
        className={cn(
          "flex flex-col items-center gap-6",
          legend === "left" ? "@md:flex-row-reverse @md:justify-between" : "@md:flex-row",
        )}
      >
        <div className="relative shrink-0" style={{ height: size, width: size }}>
          <svg
            aria-hidden="true"
            className="-rotate-90"
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            width={size}
          >
            <circle
              cx={size / 2}
              cy={size / 2}
              fill="none"
              r={radius}
              stroke="var(--muted)"
              strokeWidth={STROKE}
            />
            {visible.map((segment, index) => {
              const share = total === 0 ? 0 : Math.max(segment.value, 0) / total;
              const length = Math.max(share * circumference - GAP, 0);
              const dash = `${length} ${circumference - length}`;
              return (
                <circle
                  className={cn(
                    "transition-opacity duration-150 motion-reduce:transition-none",
                    onSelect !== undefined && "cursor-pointer",
                  )}
                  cx={size / 2}
                  cy={size / 2}
                  fill="none"
                  key={segment.key}
                  opacity={active === null || active === segment.key ? 1 : 0.35}
                  r={radius}
                  stroke={segment.color}
                  strokeDasharray={dash}
                  strokeDashoffset={-(offsets[index] ?? 0) * circumference}
                  strokeLinecap="butt"
                  strokeWidth={STROKE}
                  {...(onSelect === undefined
                    ? {}
                    : {
                        // Mouse and touch shortcut; on the keyboard, the same action is in the legend.
                        onClick: () => onSelect(segment),
                        onPointerEnter: () => setActive(segment.key),
                        onPointerLeave: () => setActive(null),
                      })}
                />
              );
            })}
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-title figure font-semibold">{centerValue}</span>
            <span className="text-caption text-muted-foreground">{centerLabel}</span>
          </div>
        </div>

        <ul aria-label={ariaLabel} className="flex w-full min-w-0 flex-1 flex-col gap-1">
          {visible.map((segment) => {
            const share = total === 0 ? 0 : Math.max(segment.value, 0) / total;

            return (
              <li key={segment.key}>
                <button
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left text-body outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
                    active === segment.key && "bg-muted",
                  )}
                  onBlur={() => setActive(null)}
                  {...(onSelect === undefined ? {} : { onClick: () => onSelect(segment) })}
                  onFocus={() => setActive(segment.key)}
                  onPointerEnter={() => setActive(segment.key)}
                  onPointerLeave={() => setActive(null)}
                  type="button"
                >
                  {legend === "left" ? (
                    <>
                      <span
                        aria-hidden="true"
                        className="size-2 shrink-0 rounded-full"
                        style={{ background: segment.color }}
                      />
                      <span className="min-w-0 flex-1 truncate">
                        {segment.label} ={" "}
                        <span className="font-medium tabular-nums">
                          {formatValue(segment.value)}
                        </span>
                      </span>
                      <span className="text-caption text-muted-foreground tabular-nums">
                        {formatPercent(share)}
                      </span>
                    </>
                  ) : (
                    <>
                      <span
                        aria-hidden="true"
                        className="h-3.5 w-1 shrink-0 rounded-full"
                        style={{ background: segment.color }}
                      />
                      {segment.icon}
                      <span className="min-w-0 flex-1 truncate">{segment.label}</span>
                      <span className="text-caption text-muted-foreground tabular-nums">
                        {formatPercent(share)}
                      </span>
                      <span className="min-w-[6.5rem] text-right font-medium whitespace-nowrap tabular-nums">
                        {formatValue(segment.value)}
                      </span>
                    </>
                  )}
                  {selectHint === undefined ? null : (
                    <span className="sr-only">, {selectHint}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
