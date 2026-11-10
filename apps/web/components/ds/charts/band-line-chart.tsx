"use client";

import { useState, type PointerEvent } from "react";

import { niceTicks, useElementWidth } from "@/components/charts/scale";

import { formatAxisNumber } from "../format";

export type BandPoint = {
  key: string;
  label: string;
  title: string;
  value: number;
  /** Uncertainty band (projections). Without it, the point is actual. */
  low?: number;
  high?: number;
};

const AXIS_WIDTH = 56;
const BOTTOM = 26;
const TOP = 14;
const RIGHT = 16;

function isProjected(point: BandPoint): boolean {
  return point.low !== undefined && point.high !== undefined;
}

/**
 * 2 px line with an uncertainty band (12% wash of the color) on projected points; the projected
 * stretch is dashed, so it does not depend on the band alone. A vertical crosshair snaps to the
 * nearest point.
 */
export function BandLineChart({
  ariaLabel,
  color,
  formatAxis = formatAxisNumber,
  formatValue,
  height = 220,
  points,
}: {
  ariaLabel: string;
  color: string;
  /** Tick labels of the value axis (compact: "12K"). */
  formatAxis?: (value: number) => string;
  formatValue: (value: number) => string;
  height?: number;
  points: BandPoint[];
}) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);

  const values = points.flatMap((point) => [
    point.value,
    point.low ?? point.value,
    point.high ?? point.value,
  ]);
  const ticks = niceTicks(Math.min(0, ...values), Math.max(0, ...values));
  const yMin = ticks[0] ?? 0;
  const yMax = ticks[ticks.length - 1] ?? 1;
  const plotWidth = Math.max(width - AXIS_WIDTH - RIGHT, 80);
  const plotHeight = height - BOTTOM - TOP;
  const step = points.length > 1 ? plotWidth / (points.length - 1) : 0;
  const x = (index: number) => AXIS_WIDTH + (points.length > 1 ? index * step : plotWidth / 2);
  const y = (value: number) => TOP + ((yMax - value) / (yMax - yMin || 1)) * plotHeight;

  const firstProjected = points.findIndex(isProjected);
  const splitAt = firstProjected === -1 ? points.length - 1 : Math.max(firstProjected - 1, 0);
  const path = (from: number, to: number) =>
    points
      .slice(from, to + 1)
      .map((point, offset) => `${offset === 0 ? "M" : "L"}${x(from + offset)},${y(point.value)}`)
      .join(" ");

  const bandIndexes = points.flatMap((point, index) =>
    isProjected(point) || index === splitAt ? [index] : [],
  );
  const bandPath =
    firstProjected === -1
      ? ""
      : [
          ...bandIndexes.map((index, order) => {
            const point = points[index];
            return `${order === 0 ? "M" : "L"}${x(index)},${y(point?.high ?? point?.value ?? 0)}`;
          }),
          ...bandIndexes.toReversed().map((index) => {
            const point = points[index];
            return `L${x(index)},${y(point?.low ?? point?.value ?? 0)}`;
          }),
          "Z",
        ].join(" ");

  const activePoint = active === null ? undefined : points[active];

  function track(event: PointerEvent<SVGRectElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const index = step === 0 ? 0 : Math.round((event.clientX - bounds.left) / step);
    setActive(Math.min(Math.max(index, 0), points.length - 1));
  }

  return (
    <div className="relative" ref={ref}>
      <svg aria-label={ariaLabel} className="block overflow-visible" height={height} width={width}>
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

        {bandPath !== "" ? <path d={bandPath} fill={color} opacity={0.12} /> : null}
        <path
          d={path(0, splitAt)}
          fill="none"
          stroke={color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
        />
        {firstProjected !== -1 ? (
          <path
            d={path(splitAt, points.length - 1)}
            fill="none"
            stroke={color}
            strokeDasharray="4 4"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
          />
        ) : null}

        {active !== null ? (
          <line
            stroke="var(--chart-axis)"
            x1={x(active)}
            x2={x(active)}
            y1={TOP}
            y2={TOP + plotHeight}
          />
        ) : null}

        {points.map((point, index) => (
          <g key={point.key}>
            <circle
              cx={x(index)}
              cy={y(point.value)}
              fill={isProjected(point) ? "var(--card)" : color}
              r={active === index ? 5 : 4}
              stroke={isProjected(point) ? color : "var(--card)"}
              strokeWidth={2}
            />
            <text
              className="fill-muted-foreground text-[11px]"
              textAnchor="middle"
              x={x(index)}
              y={height - 8}
            >
              {point.label}
            </text>
            <circle
              aria-label={`${point.title}: ${formatValue(point.value)}${
                isProjected(point)
                  ? `, projected between ${formatValue(point.low ?? 0)} and ${formatValue(point.high ?? 0)}`
                  : ""
              }`}
              className="fill-transparent outline-none"
              cx={x(index)}
              cy={y(point.value)}
              onBlur={() => setActive(null)}
              onFocus={() => setActive(index)}
              r={12}
              role="graphics-symbol"
              tabIndex={0}
            />
          </g>
        ))}

        <rect
          aria-hidden="true"
          fill="transparent"
          height={plotHeight}
          onPointerLeave={() => setActive(null)}
          onPointerMove={track}
          width={plotWidth + step}
          x={AXIS_WIDTH - step / 2}
          y={TOP}
        />
      </svg>

      {activePoint !== undefined && active !== null ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-lg border border-border bg-popover px-3 py-2 text-caption shadow-popover"
          style={{
            left: Math.min(Math.max(x(active), 90), Math.max(width - 90, 90)),
          }}
        >
          <p className="text-muted-foreground">
            {activePoint.title}
            {isProjected(activePoint) ? " · projection" : ""}
          </p>
          <p className="font-semibold tabular-nums">{formatValue(activePoint.value)}</p>
          {isProjected(activePoint) ? (
            <p className="text-muted-foreground tabular-nums">
              {formatValue(activePoint.low ?? 0)} to {formatValue(activePoint.high ?? 0)}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
