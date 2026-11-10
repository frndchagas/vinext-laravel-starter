"use client";

import { useState, type ReactNode } from "react";

import { barPath, niceTicks, useElementWidth } from "@/components/charts/scale";
import { cn } from "@/lib/utils";

import { formatAxisNumber } from "../format";

export type PeriodSeries = { key: string; label: string; color: string };

export type PeriodPhase = "past" | "current" | "forecast";

export type PeriodDatum = {
  key: string;
  /** Axis label ("Oct"). */
  label: string;
  /** Tooltip title ("October 2026"). */
  title: string;
  phase: PeriodPhase;
  values: Record<string, number>;
};

export type PeriodSummary = { label: string; value: number };

const AXIS_WIDTH = 56;
const BOTTOM = 26;
const TOP = 22;
const STACK_GAP = 3;
const GROUP_GAP = 3;

const PHASE_LABEL = {
  current: "Actual",
  forecast: "Forecast",
  past: "Actual",
} as const satisfies Record<PeriodPhase, string>;

function sum(values: Record<string, number>, series: PeriodSeries[]): number {
  return series.reduce((total, item) => total + (values[item.key] ?? 0), 0);
}

/** Past in a soft tone, current month saturated, forecast as a dashed ghost bar. */
function markStyle(phase: PeriodPhase, color: string) {
  if (phase === "forecast") {
    return {
      fill: "var(--muted)",
      stroke: "var(--border-strong)",
      strokeDasharray: "3 3",
      strokeWidth: 1,
    };
  }
  return { fill: color, fillOpacity: phase === "past" ? 0.42 : 1 };
}

/** Rectangle with all four corners rounded: each stacked segment is a pill. */
function pillPath(x: number, top: number, width: number, height: number): string {
  if (height < 1) return "";
  const r = Math.min(8, width / 2, height / 2);

  return [
    `M${x + r},${top}`,
    `H${x + width - r}`,
    `Q${x + width},${top} ${x + width},${top + r}`,
    `V${top + height - r}`,
    `Q${x + width},${top + height} ${x + width - r},${top + height}`,
    `H${x + r}`,
    `Q${x},${top + height} ${x},${top + height - r}`,
    `V${top + r}`,
    `Q${x},${top} ${x + r},${top}`,
    "Z",
  ].join(" ");
}

/**
 * Bars per period with past, current month and forecast: past months in a soft tone, current month
 * saturated, a dashed "Today" line and future months as ghost bars. `layout="stacked"` stacks
 * categories in pills separated by 3 px; `layout="grouped"` puts the series side by side.
 * Focus/hover shows the breakdown per series and the summary.
 */
export function PeriodBarChart({
  ariaLabel,
  controls,
  data,
  forecastLabel = "Forecast",
  formatAxis = formatAxisNumber,
  formatValue,
  height = 260,
  layout,
  series,
  summary,
  todayLabel = "Today",
}: {
  ariaLabel: string;
  /** Controls to the right of the legend (for example a SegmentedControl "Monthly"). */
  controls?: ReactNode;
  data: PeriodDatum[];
  forecastLabel?: string;
  /** Tick labels of the value axis (compact: "12K"). */
  formatAxis?: (value: number) => string;
  formatValue: (value: number) => string;
  height?: number;
  layout: "stacked" | "grouped";
  series: PeriodSeries[];
  /** Last line of the tooltip. Default: "Total" when stacked, none when grouped. */
  summary?: (values: Record<string, number>) => PeriodSummary;
  todayLabel?: string;
}) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);

  const peaks = data.map((datum) =>
    layout === "stacked"
      ? sum(datum.values, series)
      : Math.max(0, ...series.map((item) => datum.values[item.key] ?? 0)),
  );
  const ticks = niceTicks(0, Math.max(0, ...peaks));
  const yMax = ticks[ticks.length - 1] ?? 1;
  const plotWidth = Math.max(width - AXIS_WIDTH, 80);
  const plotHeight = height - BOTTOM - TOP;
  const y = (value: number) => TOP + ((yMax - value) / (yMax || 1)) * plotHeight;
  const band = plotWidth / Math.max(data.length, 1);
  const stackWidth = Math.max(8, Math.min(40, band * 0.62));
  const groupBar = Math.max(
    3,
    Math.min(16, (band * 0.66 - GROUP_GAP * (series.length - 1)) / series.length),
  );
  const groupWidth = groupBar * series.length + GROUP_GAP * (series.length - 1);
  // Axis labels: on narrow screens, one every N months (the current month always shows).
  const labelEvery = band < 34 ? Math.ceil(34 / band) : 1;
  const firstForecast = data.findIndex((datum) => datum.phase === "forecast");
  const todayX = firstForecast > 0 ? AXIS_WIDTH + firstForecast * band : undefined;
  const hasForecast = firstForecast !== -1;
  const activeDatum = active === null ? undefined : data[active];
  const resolveSummary =
    summary ??
    (layout === "stacked"
      ? (values: Record<string, number>) => ({
          label: "Total",
          value: sum(values, series),
        })
      : undefined);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ul
          aria-label="Legend"
          className="flex flex-wrap gap-x-4 gap-y-1 text-label text-muted-foreground"
        >
          {series.map((item) => (
            <li className="flex items-center gap-1.5" key={item.key}>
              <span
                aria-hidden="true"
                className="size-2 rounded-full"
                style={{ background: item.color }}
              />
              {item.label}
            </li>
          ))}
          {hasForecast ? (
            <li className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="size-2 rounded-full border border-dashed border-subtle-foreground"
              />
              {forecastLabel}
            </li>
          ) : null}
        </ul>
        {controls}
      </div>

      <div className="relative" ref={ref}>
        <svg
          aria-label={ariaLabel}
          className="block overflow-visible"
          height={height}
          width={width}
        >
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                stroke={tick === 0 ? "var(--chart-axis)" : "var(--chart-grid)"}
                x1={AXIS_WIDTH}
                x2={AXIS_WIDTH + plotWidth}
                y1={Math.round(y(tick)) + 0.5}
                y2={Math.round(y(tick)) + 0.5}
              />
              <text
                className="fill-muted-foreground text-[11px] tabular-nums"
                dominantBaseline="middle"
                textAnchor="end"
                x={AXIS_WIDTH - 8}
                y={y(tick)}
              >
                {formatAxis(tick)}
              </text>
            </g>
          ))}

          {todayX !== undefined ? (
            <g aria-hidden="true">
              <line
                stroke="var(--subtle-foreground)"
                strokeDasharray="3 3"
                x1={todayX}
                x2={todayX}
                y1={TOP - 4}
                y2={TOP + plotHeight}
              />
              <text
                className="fill-foreground text-[11px] font-medium"
                textAnchor="middle"
                x={todayX}
                y={TOP - 10}
              >
                {todayLabel}
              </text>
            </g>
          ) : null}

          {data.map((datum, index) => {
            const bandX = AXIS_WIDTH + index * band;
            const marks =
              layout === "stacked"
                ? (() => {
                    let base = 0;
                    return series.map((item) => {
                      const value = Math.max(datum.values[item.key] ?? 0, 0);
                      const bottom = y(base);
                      const top = y(base + value);
                      base += value;
                      const segmentHeight = bottom - top - STACK_GAP;
                      return (
                        <path
                          d={pillPath(
                            bandX + (band - stackWidth) / 2,
                            top,
                            stackWidth,
                            segmentHeight,
                          )}
                          key={item.key}
                          {...markStyle(datum.phase, item.color)}
                        />
                      );
                    });
                  })()
                : series.map((item, seriesIndex) => (
                    <path
                      d={barPath(
                        bandX + (band - groupWidth) / 2 + seriesIndex * (groupBar + GROUP_GAP),
                        y(0),
                        y(Math.max(datum.values[item.key] ?? 0, 0)),
                        groupBar,
                      )}
                      key={item.key}
                      {...markStyle(datum.phase, item.color)}
                    />
                  ));
            const spoken = series
              .map((item) => `${item.label} ${formatValue(datum.values[item.key] ?? 0)}`)
              .join(", ");

            return (
              <g key={datum.key}>
                {active === index ? (
                  <rect
                    fill="var(--muted)"
                    fillOpacity={0.6}
                    height={plotHeight}
                    rx={8}
                    width={band - 4}
                    x={bandX + 2}
                    y={TOP}
                  />
                ) : null}
                {marks}
                <text
                  className={cn(
                    "text-[11px]",
                    index % labelEvery !== 0 && datum.phase !== "current" && "hidden",
                    datum.phase === "current"
                      ? "fill-foreground font-semibold"
                      : "fill-muted-foreground",
                  )}
                  textAnchor="middle"
                  x={bandX + band / 2}
                  y={height - 8}
                >
                  {datum.label}
                </text>
                <rect
                  aria-label={`${datum.title}, ${PHASE_LABEL[datum.phase].toLowerCase()}: ${spoken}`}
                  className="fill-transparent outline-none"
                  height={plotHeight + BOTTOM}
                  onBlur={() => setActive(null)}
                  onFocus={() => setActive(index)}
                  onPointerEnter={() => setActive(index)}
                  onPointerLeave={() => setActive(null)}
                  role="graphics-symbol"
                  tabIndex={0}
                  width={band}
                  x={bandX}
                  y={TOP}
                />
              </g>
            );
          })}
        </svg>

        {activeDatum !== undefined && active !== null ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-6 z-10 min-w-52 rounded-xl border border-border bg-popover p-3 text-label shadow-popover"
            style={{
              left:
                AXIS_WIDTH + (active + 0.5) * band + 16 + 220 > width
                  ? Math.max(AXIS_WIDTH + (active + 0.5) * band - 16 - 220, 0)
                  : AXIS_WIDTH + (active + 0.5) * band + 16,
            }}
          >
            <p className="mb-2 text-caption text-muted-foreground">
              {activeDatum.title} · {PHASE_LABEL[activeDatum.phase]}
            </p>
            <div className="flex flex-col gap-1.5">
              {series.map((item) => (
                <p className="flex items-center justify-between gap-6" key={item.key}>
                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="size-2 rounded-[3px]"
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
            {resolveSummary !== undefined ? (
              <p className="mt-2 flex items-center justify-between gap-6 border-t border-border pt-2 font-semibold">
                <span>{resolveSummary(activeDatum.values).label}</span>
                <span className="tabular-nums">
                  {formatValue(resolveSummary(activeDatum.values).value)}
                </span>
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
