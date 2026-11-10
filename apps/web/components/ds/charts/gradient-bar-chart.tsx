"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

import { barPath, niceTicks, useElementWidth } from "@/components/charts/scale";
import { cn } from "@/lib/utils";

import { formatAxisNumber } from "../format";

export type GradientSeries = {
  key: string;
  label: string;
  /** Color at the tip of the bar. */
  color: string;
  /** Color at the base; without it, the same color at 45% (soft gradient of one hue). */
  colorTo?: string;
};

export type GradientDatum = {
  key: string;
  /** Short axis label ("Nov 26"). */
  label: string;
  /** Tooltip title ("November 2026"). */
  title: string;
  values: Record<string, number>;
};

/** Single series of the hero chart: violet at the tip, pink at the base. */
export const HERO_SERIES = {
  color: "var(--hero-1)",
  colorTo: "var(--ai-to)",
} as const;

const AXIS_WIDTH = 56;
const BOTTOM = 26;
const TOP = 10;
const GAP = 2;
const MAX_BAR = 24;
/**
 * Minimum width of each group (one month): below it, on phones, bars were 4 px wide and the axis
 * showed every other month. With less room, the chart scrolls horizontally inside the card (the
 * value axis stays put on the left) and opens at the end, on the most recent months.
 */
const MIN_BAND = 40;

/**
 * Grouped columns with a vertical gradient (saturated tip, lighter base). The gradient is only a
 * finish: the color keeps identifying the series. Each group takes focus and hover with every value;
 * Enter opens the detail (`onSelect`). Too narrow for `MIN_BAND` per group, the bar area scrolls
 * horizontally inside the card, never the page.
 */
export function GradientBarChart({
  ariaLabel,
  data,
  formatAxis = formatAxisNumber,
  formatValue,
  height = 240,
  onSelect,
  series,
}: {
  ariaLabel: string;
  data: GradientDatum[];
  /** Tick labels of the value axis (compact: "12K"). */
  formatAxis?: (value: number) => string;
  formatValue: (value: number) => string;
  height?: number;
  onSelect?: (datum: GradientDatum) => void;
  series: GradientSeries[];
}) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [atEnd, setAtEnd] = useState(true);
  const [active, setActive] = useState<number | null>(null);
  const gradientPrefix = useId().replace(/:/g, "");

  const values = data.flatMap((datum) => series.map((item) => datum.values[item.key] ?? 0));
  const ticks = niceTicks(Math.min(0, ...values), Math.max(0, ...values));
  const yMin = ticks[0] ?? 0;
  const yMax = ticks[ticks.length - 1] ?? 1;
  const visibleWidth = Math.max(width - AXIS_WIDTH, 80);
  const plotWidth = Math.max(visibleWidth, MIN_BAND * data.length);
  const scrolls = plotWidth > visibleWidth;
  const plotHeight = height - BOTTOM - TOP;
  const y = (value: number) => TOP + ((yMax - value) / (yMax - yMin || 1)) * plotHeight;
  const band = plotWidth / Math.max(data.length, 1);
  const barWidth = Math.max(
    4,
    Math.min(MAX_BAR, (band * 0.6 - GAP * (series.length - 1)) / series.length),
  );
  const groupWidth = barWidth * series.length + GAP * (series.length - 1);
  const labelEvery = band < 36 ? Math.ceil(36 / band) : 1;
  const activeDatum = active === null ? undefined : data[active];

  // When scrolling, open at the most recent months (the end of the series).
  useEffect(() => {
    const scroller = scrollRef.current;
    if (scroller === null || !scrolls) return;
    scroller.scrollLeft = scroller.scrollWidth;
    setScrollLeft(scroller.scrollLeft);
    setAtEnd(true);
  }, [scrolls]);

  function handleKey(event: KeyboardEvent, datum: GradientDatum) {
    if (onSelect !== undefined && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      onSelect(datum);
    }
  }

  return (
    <div className="relative min-w-0" ref={ref}>
      <div className="flex">
        {/* Value axis outside the scrolling area: it stays in view while the bars run. */}
        <svg
          aria-hidden="true"
          className="block shrink-0 overflow-visible"
          height={height}
          width={AXIS_WIDTH}
        >
          {ticks.map((tick) => (
            <text
              className="fill-muted-foreground text-[11px] tabular-nums"
              dominantBaseline="middle"
              key={tick}
              textAnchor="end"
              x={AXIS_WIDTH - 8}
              y={y(tick)}
            >
              {formatAxis(tick)}
            </text>
          ))}
        </svg>
        <div
          className={cn(
            "min-w-0 flex-1 overscroll-x-contain",
            scrolls && "[scrollbar-width:thin] overflow-x-auto",
            // Fades the edge on the side that still has hidden months: the hint that it scrolls.
            scrolls &&
              scrollLeft > 1 &&
              (atEnd
                ? "[mask-image:linear-gradient(to_right,transparent,black_24px)]"
                : "[mask-image:linear-gradient(to_right,transparent,black_24px,black_calc(100%-24px),transparent)]"),
            scrolls &&
              scrollLeft <= 1 &&
              !atEnd &&
              "[mask-image:linear-gradient(to_left,transparent,black_24px)]",
          )}
          data-chart-scroll={scrolls ? "" : undefined}
          onScroll={(event) => {
            const target = event.currentTarget;
            setScrollLeft(target.scrollLeft);
            setAtEnd(target.scrollLeft + target.clientWidth >= target.scrollWidth - 1);
          }}
          ref={scrollRef}
        >
          <svg
            aria-label={ariaLabel}
            className="block max-w-none overflow-visible"
            height={height}
            width={plotWidth}
          >
            <defs>
              {series.map((item) => (
                <linearGradient
                  id={`${gradientPrefix}-${item.key}`}
                  key={item.key}
                  x1="0"
                  x2="0"
                  y1="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor={item.color} />
                  <stop
                    offset="100%"
                    stopColor={item.colorTo ?? item.color}
                    stopOpacity={item.colorTo === undefined ? 0.45 : 0.85}
                  />
                </linearGradient>
              ))}
            </defs>

            {ticks.map((tick) => (
              <line
                key={tick}
                stroke={tick === 0 ? "var(--chart-axis)" : "var(--chart-grid)"}
                x1={0}
                x2={plotWidth}
                y1={Math.round(y(tick)) + 0.5}
                y2={Math.round(y(tick)) + 0.5}
              />
            ))}

            {data.map((datum, index) => {
              const x0 = index * band + (band - groupWidth) / 2;
              const summary = series
                .map((item) => `${item.label} ${formatValue(datum.values[item.key] ?? 0)}`)
                .join(", ");

              return (
                <g key={datum.key}>
                  {active === index ? (
                    <rect
                      fill="var(--muted)"
                      height={plotHeight}
                      rx={6}
                      width={band - 4}
                      x={index * band + 2}
                      y={TOP}
                    />
                  ) : null}
                  {series.map((item, seriesIndex) => (
                    <path
                      d={barPath(
                        x0 + seriesIndex * (barWidth + GAP),
                        y(0),
                        y(datum.values[item.key] ?? 0),
                        barWidth,
                      )}
                      fill={`url(#${gradientPrefix}-${item.key})`}
                      key={item.key}
                    />
                  ))}
                  {index % labelEvery === 0 ? (
                    <text
                      className="fill-muted-foreground text-[11px]"
                      textAnchor="middle"
                      x={index * band + band / 2}
                      y={height - 8}
                    >
                      {datum.label}
                    </text>
                  ) : null}
                  <rect
                    aria-label={`${datum.title}: ${summary}`}
                    className={cn("fill-transparent outline-none", onSelect && "cursor-pointer")}
                    height={plotHeight + BOTTOM}
                    onBlur={() => setActive(null)}
                    onClick={() => onSelect?.(datum)}
                    onFocus={() => setActive(index)}
                    onKeyDown={(event) => handleKey(event, datum)}
                    onPointerEnter={() => setActive(index)}
                    onPointerLeave={() => setActive(null)}
                    role={onSelect ? "button" : "graphics-symbol"}
                    tabIndex={0}
                    width={band}
                    x={index * band}
                    y={TOP}
                  />
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {activeDatum !== undefined && active !== null ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-0 z-10 min-w-40 -translate-x-1/2 rounded-lg border border-border bg-popover px-3 py-2 text-caption shadow-popover"
          style={{
            left: Math.min(
              Math.max(AXIS_WIDTH + active * band + band / 2 - scrollLeft, 90),
              Math.max(width - 90, 90),
            ),
          }}
        >
          <p className="mb-1 text-muted-foreground">{activeDatum.title}</p>
          {series.map((item) => (
            <p className="flex items-center justify-between gap-4" key={item.key}>
              <span className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="size-2 rounded-[2px]"
                  style={{ background: item.color }}
                />
                {item.label}
              </span>
              <span className="font-semibold tabular-nums">
                {formatValue(activeDatum.values[item.key] ?? 0)}
              </span>
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}
