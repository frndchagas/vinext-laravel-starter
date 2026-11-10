"use client";

import { useRef, useState, type KeyboardEvent } from "react";

import { niceTicks, useElementWidth } from "@/components/charts/scale";
import { cn } from "@/lib/utils";

import { formatAxisNumber, formatPercent } from "../format";

/** One step: signed value (positive moves right, negative moves left). */
export type WaterfallSegment = {
  key: string;
  label: string;
  value: number;
  color: string;
  /** Extra breakdown for the tooltip ("Web $4,000 / Mobile $6,000"). */
  detail?: string | undefined;
};

/** One row (quarter, year): the steps run in sequence, each from where the previous ended. */
export type WaterfallRow = {
  key: string;
  /** Axis label ("Q1 26"). */
  label: string;
  /** Tooltip title ("Q1 2026, Jan to Mar"). */
  title: string;
  segments: ReadonlyArray<WaterfallSegment>;
};

export type WaterfallStep = {
  start: number;
  end: number;
  segment: WaterfallSegment;
};

export type WaterfallLayoutRow = {
  row: WaterfallRow;
  steps: WaterfallStep[];
  /** Running total at the end of the row. */
  cumulative: number;
  /** Running total ÷ final total (null when the total is zero). */
  share: number | null;
  /** The row's own share of the total: what it added ÷ final total (null when the total is zero). */
  rowShare: number | null;
};

/** Waterfall positions: each step starts where the previous one ended. */
export function waterfallLayout(rows: ReadonlyArray<WaterfallRow>): {
  rows: WaterfallLayoutRow[];
  total: number;
  min: number;
  max: number;
} {
  let running = 0;
  let min = 0;
  let max = 0;
  const steps = rows.map((row) => {
    const rowSteps = row.segments
      .filter((segment) => segment.value !== 0)
      .map((segment) => {
        const start = running;
        running += segment.value;
        min = Math.min(min, running);
        max = Math.max(max, running);
        return { end: running, segment, start };
      });

    const net = rowSteps.reduce((sum, step) => sum + step.segment.value, 0);

    return { cumulative: running, net, row, steps: rowSteps };
  });
  const total = running;

  return {
    max,
    min,
    rows: steps.map(({ net, ...item }) =>
      Object.assign({}, item, {
        rowShare: total === 0 ? null : net / total,
        share: total === 0 ? null : item.cumulative / total,
      }),
    ),
    total,
  };
}

/** Radius of every bar (steps and total): same thickness, same radius, same spacing. */
const BAR_RADIUS = 4;

const LABEL_WIDTH = 64;
/** Band for the label above the bar when it does not fit beside it (narrow screen). */
const LABEL_BAND = 14;
const RIGHT = 12;
const BOTTOM = 24;
const TOOLTIP_WIDTH = 248;
/** Approximate width of one character of the 11 px label, to decide which side it fits on. */
const CHAR_WIDTH = 6.2;
/** Estimated width of the 11 px label. */
function widthOf(text: string): number {
  return text.length * CHAR_WIDTH;
}

const NAVIGATION_KEYS = ["ArrowUp", "ArrowDown", "Home", "End"] as const;

/**
 * Horizontal waterfall ("decomposition by channel"): one row per period, each step starts where
 * the previous ended, so the position shows the running total and the width the period's value.
 * Positive moves right, negative moves left; with more than one step on a row, all share the same
 * thickness and the next one comes back over the tip of the previous. The last row is the total, a
 * full bar from zero to the final value. Labels with the value and the row's share of the total
 * ("· 83% of total") beside the bar (text in ink, never in the series color); when the value does
 * not fit beside the bar (narrow screen), the label moves to its own line above the bar, and the
 * value never disappears. One tab stop: arrow up and down switch rows and open the tooltip.
 */
export function WaterfallChart({
  ariaLabel,
  formatAxis = formatAxisNumber,
  formatValue,
  rowHeight = 36,
  rows,
  total,
}: {
  ariaLabel: string;
  formatAxis?: (value: number) => string;
  formatValue: (value: number, options?: { signed?: boolean }) => string;
  rowHeight?: number;
  rows: ReadonlyArray<WaterfallRow>;
  total: { label: string; title?: string; color: string };
}) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [hovered, setHovered] = useState<number | null>(null);
  const [focused, setFocused] = useState<number | null>(null);
  const [cursor, setCursor] = useState(0);
  const targets = useRef<Array<SVGRectElement | null>>([]);

  const layout = waterfallLayout(rows);
  const ticks = niceTicks(layout.min, layout.max);
  const xMin = ticks[0] ?? 0;
  const xMax = ticks[ticks.length - 1] ?? 1;
  const plotWidth = Math.max(width - LABEL_WIDTH - RIGHT, 120);
  const x = (value: number) => LABEL_WIDTH + ((value - xMin) / (xMax - xMin || 1)) * plotWidth;
  const lineCount = layout.rows.length + 1;
  const barHeight = Math.min(22, rowHeight * 0.62);
  const plotRight = LABEL_WIDTH + plotWidth;
  const placements = layout.rows.map((item) => {
    const edges = item.steps.flatMap((step) => [step.start, step.end]);
    const left = x(Math.min(...edges, item.cumulative));
    const right = x(Math.max(...edges, item.cumulative));

    return { left, placement: labelPlacement(left, right, rowLabels(item)) };
  });
  // Some label did not fit beside the bar with its value: all move to the band above, so rows stay equal.
  const stacked = placements.some(({ placement }) => placement === null);
  const lineHeight = stacked ? rowHeight + LABEL_BAND : rowHeight;
  const barOffset = (stacked ? LABEL_BAND : 0) + (rowHeight - barHeight) / 2;
  const barMiddle = barOffset + barHeight / 2;
  const height = lineCount * lineHeight + BOTTOM;
  // Axis labels at least ~88 px apart; on a narrow screen, every other one.
  const tickSpacing = plotWidth / Math.max(ticks.length - 1, 1);
  const tickLabelEvery = tickSpacing < 88 ? 2 : 1;
  const totalIndex = layout.rows.length;

  const active = focused ?? hovered;

  /**
   * From the fullest to the shortest, always with the value: every step + share, the first step +
   * share, the first step + %, only the first step.
   */
  function rowLabels(item: WaterfallLayoutRow): string[] {
    const values = item.steps.map((step) => formatValue(step.segment.value, { signed: true }));
    const first = values[0] ?? "";
    if (item.rowShare === null) return [values.join(" "), first];
    const share = formatPercent(item.rowShare);

    return [
      `${values.join(" ")} · ${share} of total`,
      `${first} · ${share} of total`,
      `${first} · ${share}`,
      first,
    ];
  }

  function rowSpoken(item: WaterfallLayoutRow): string {
    const parts = item.steps.map(
      (step) =>
        `${step.segment.label} ${formatValue(Math.abs(step.segment.value))}${step.segment.detail === undefined ? "" : ` (${step.segment.detail})`}`,
    );
    const share = item.rowShare === null ? "" : `, ${formatPercent(item.rowShare)} of total`;

    return `${item.row.title}: ${parts.join(", ")}${share}. Running total ${formatValue(item.cumulative)}`;
  }

  function moveTo(index: number) {
    const next = Math.min(Math.max(index, 0), totalIndex);
    setCursor(next);
    targets.current[next]?.focus();
  }

  function handleKey(event: KeyboardEvent<SVGRectElement>, index: number) {
    const key = NAVIGATION_KEYS.find((candidate) => candidate === event.key);
    if (key === undefined) return;
    event.preventDefault();
    const destination = {
      ArrowDown: index + 1,
      ArrowUp: index - 1,
      End: totalIndex,
      Home: 0,
    } as const satisfies Record<(typeof NAVIGATION_KEYS)[number], number>;
    moveTo(destination[key]);
  }

  /**
   * Label to the right of the bar; if it does not fit, to the left (without invading the row
   * labels); on a narrow screen, falls back to the shortest version that fits. If not even the value
   * alone fits, null: the label moves to the band above (`stackedPlacement`).
   */
  function labelPlacement(left: number, right: number, texts: ReadonlyArray<string>) {
    for (const text of texts) {
      if (right + 8 + widthOf(text) <= plotRight + RIGHT) {
        return { anchor: "start" as const, text, x: right + 8 };
      }
      if (left - 8 - widthOf(text) >= LABEL_WIDTH) {
        return { anchor: "end" as const, text, x: left - 8 };
      }
    }
    return null;
  }

  /** In the band above, from the start of the bar; without room, flush with the end of the chart. */
  function stackedPlacement(left: number, texts: ReadonlyArray<string>) {
    const start = Math.max(left, LABEL_WIDTH);
    const end = plotRight + RIGHT;
    const text =
      texts.find((candidate) => start + widthOf(candidate) <= end) ??
      texts.find((candidate) => LABEL_WIDTH + widthOf(candidate) <= end) ??
      texts[texts.length - 1] ??
      "";

    return start + widthOf(text) <= end
      ? { anchor: "start" as const, text, x: start }
      : { anchor: "end" as const, text, x: end };
  }

  const totalText = `${formatValue(layout.total)} · 100%`;
  // Without room on the right, the total goes inside its own bar, in contrast ink.
  const totalFitsOutside = x(layout.total) + 8 + totalText.length * CHAR_WIDTH <= plotRight + RIGHT;
  const totalSpoken = `${total.title ?? total.label}: ${formatValue(layout.total)}`;
  const activeItem = active !== null && active < totalIndex ? layout.rows[active] : undefined;
  // In the bottom half, the tooltip opens above the row so it stays inside the chart.
  const tooltipAbove = active !== null && active >= lineCount / 2;
  const tooltipTop =
    active === null ? 0 : tooltipAbove ? active * lineHeight - 4 : (active + 1) * lineHeight + 4;
  const tooltipLeft = Math.min(
    Math.max(
      (activeItem === undefined
        ? x(layout.total)
        : x(Math.max(...activeItem.steps.map((step) => Math.max(step.start, step.end)), 0))) -
        TOOLTIP_WIDTH / 2,
      0,
    ),
    Math.max(width - TOOLTIP_WIDTH, 0),
  );

  return (
    <div className="relative" ref={ref}>
      <svg aria-label={ariaLabel} className="block overflow-visible" height={height} width={width}>
        {ticks.map((tick, index) => (
          <g aria-hidden="true" key={tick}>
            <line
              stroke={tick === 0 ? "var(--chart-axis)" : "var(--chart-grid)"}
              x1={Math.round(x(tick)) + 0.5}
              x2={Math.round(x(tick)) + 0.5}
              y1={0}
              y2={lineCount * lineHeight}
            />
            <text
              className={cn(
                "fill-muted-foreground text-[11px] tabular-nums",
                index % tickLabelEvery !== 0 && "hidden",
              )}
              textAnchor={tick === xMax ? "end" : "middle"}
              x={x(tick)}
              y={height - 6}
            >
              {formatAxis(tick)}
            </text>
          </g>
        ))}

        {active !== null ? (
          <rect
            aria-hidden="true"
            fill="var(--muted)"
            fillOpacity={0.7}
            height={lineHeight - 2}
            rx={8}
            width={width}
            x={0}
            y={active * lineHeight + 1}
          />
        ) : null}

        {layout.rows.map((item, index) => {
          const top = index * lineHeight + barOffset;
          const { left, placement: beside } = placements[index] ?? { left: 0, placement: null };
          const placement =
            stacked || beside === null ? stackedPlacement(left, rowLabels(item)) : beside;
          const next = index + 1;

          return (
            <g aria-hidden="true" key={item.row.key}>
              <text
                className={cn(
                  "text-[11px]",
                  active === index ? "fill-foreground font-medium" : "fill-muted-foreground",
                )}
                dominantBaseline="middle"
                textAnchor="end"
                x={LABEL_WIDTH - 10}
                y={index * lineHeight + barMiddle}
              >
                {item.row.label}
              </text>
              {item.steps.map((step, stepIndex) => {
                const from = x(Math.min(step.start, step.end));
                const to = x(Math.max(step.start, step.end));

                return (
                  // Every step with the bar's thickness: the next one (a return) comes back over the
                  // tip of the previous, in the same band, and the line neither thins nor gets a loose dot.
                  <rect
                    data-step={stepIndex}
                    fill={step.segment.color}
                    height={barHeight}
                    key={step.segment.key}
                    rx={BAR_RADIUS}
                    width={Math.max(to - from, 3)}
                    x={from}
                    y={top}
                  />
                );
              })}
              {/* Connector to the next row, at the point where this one ended. */}
              <line
                stroke="var(--chart-axis)"
                strokeDasharray="2 2"
                x1={x(item.cumulative)}
                x2={x(item.cumulative)}
                y1={top + barHeight}
                y2={next * lineHeight + barOffset}
              />
              <text
                className="fill-foreground text-[11px] font-medium tabular-nums"
                dominantBaseline="middle"
                textAnchor={placement.anchor}
                x={placement.x}
                y={index * lineHeight + (stacked ? LABEL_BAND / 2 + 2 : barMiddle)}
              >
                {placement.text}
              </text>
            </g>
          );
        })}

        <g aria-hidden="true">
          <text
            className="fill-foreground text-[11px] font-semibold"
            dominantBaseline="middle"
            textAnchor="end"
            x={LABEL_WIDTH - 10}
            y={totalIndex * lineHeight + barMiddle}
          >
            {total.label}
          </text>
          <rect
            data-total=""
            fill={total.color}
            height={barHeight}
            rx={BAR_RADIUS}
            width={Math.max(Math.abs(x(layout.total) - x(0)), 2)}
            x={Math.min(x(0), x(layout.total))}
            y={totalIndex * lineHeight + barOffset}
          />
          <text
            className={cn(
              "text-[11px] font-semibold tabular-nums",
              totalFitsOutside ? "fill-foreground" : "fill-background",
            )}
            dominantBaseline="middle"
            textAnchor={totalFitsOutside ? "start" : "end"}
            x={totalFitsOutside ? x(layout.total) + 8 : x(layout.total) - 8}
            y={totalIndex * lineHeight + barMiddle}
          >
            {totalText}
          </text>
        </g>

        {[...layout.rows.map(rowSpoken), totalSpoken].map((spoken, index) => (
          <rect
            aria-label={spoken}
            className="fill-transparent outline-none"
            height={lineHeight}
            key={spoken}
            onBlur={() => setFocused(null)}
            onFocus={() => {
              setCursor(index);
              setFocused(index);
            }}
            onKeyDown={(event) => handleKey(event, index)}
            onPointerEnter={() => setHovered(index)}
            onPointerLeave={() => setHovered(null)}
            ref={(node) => {
              targets.current[index] = node;
            }}
            role="graphics-symbol"
            tabIndex={index === cursor ? 0 : -1}
            width={width}
            x={0}
            y={index * lineHeight}
          />
        ))}

        {focused !== null ? (
          <rect
            aria-hidden="true"
            fill="none"
            height={lineHeight - 2}
            pointerEvents="none"
            rx={8}
            stroke="var(--ring)"
            strokeWidth={2}
            width={width - 2}
            x={1}
            y={focused * lineHeight + 1}
          />
        ) : null}
      </svg>

      {active !== null ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute z-10 rounded-xl border border-border bg-popover p-3 text-label shadow-popover"
          data-testid="waterfall-tooltip"
          style={{
            left: tooltipLeft,
            top: tooltipTop,
            transform: tooltipAbove ? "translateY(-100%)" : undefined,
            width: TOOLTIP_WIDTH,
          }}
        >
          {activeItem === undefined ? (
            <p className="flex items-center justify-between gap-4 font-semibold">
              <span>{total.title ?? total.label}</span>
              <span className="tabular-nums">{formatValue(layout.total)}</span>
            </p>
          ) : (
            <>
              <p className="mb-2 font-semibold">{activeItem.row.title}</p>
              <dl className="flex flex-col gap-1.5">
                {activeItem.steps.map((step) => (
                  <div
                    className="grid grid-cols-[1fr_auto] items-center gap-x-4"
                    key={step.segment.key}
                  >
                    <dt className="flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className="size-2 rounded-[3px]"
                        style={{ background: step.segment.color }}
                      />
                      {step.segment.label}
                    </dt>
                    <dd className="font-medium tabular-nums">
                      {formatValue(Math.abs(step.segment.value))}
                    </dd>
                    {step.segment.detail !== undefined ? (
                      <dd className="col-span-2 pl-4 text-caption text-muted-foreground tabular-nums">
                        {step.segment.detail}
                      </dd>
                    ) : null}
                  </div>
                ))}
              </dl>
              <p className="mt-2 flex items-center justify-between gap-4 border-t border-border pt-2 font-semibold">
                <span>Running total</span>
                <span className="tabular-nums">
                  {formatValue(activeItem.cumulative)}
                  {activeItem.share === null ? null : (
                    <span className="font-normal text-muted-foreground">
                      {" "}
                      ({formatPercent(activeItem.share)})
                    </span>
                  )}
                </span>
              </p>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
