import { cn } from "@/lib/utils";

export type ForecastPoint = {
  /** YYYY-MM-DD */
  date: string;
  /** Short date label ("12/05"). */
  label: string;
  value: number;
};

const PAD = 8;
/** Bottom breathing room (% of the height) when the valley gets a label: the text sits under the whole line. */
const VALLEY_PAD = 26;

/**
 * Index of the valley (the lowest value of the series, the first time it appears) when it deserves
 * its own mark: it is not the last point and differs from the end (the end label already says that number).
 */
export function valleyIndex(values: ReadonlyArray<number>): number | null {
  if (values.length < 2) return null;
  const lowest = Math.min(...values);
  const index = values.indexOf(lowest);
  const last = values[values.length - 1];
  return index === values.length - 1 || last === lowest ? null : index;
}

/** Point already positioned: `x` from 0 to 100. */
export type PlotPoint = { x: number; value: number };

/** Continuous stretch of the line, entirely above (or at) the threshold or entirely below it. */
export type ThresholdRun = { below: boolean; points: PlotPoint[] };

/**
 * Splits the series into runs above and below the threshold, cutting each crossing exactly where
 * the segment crosses it: the leaving and the entering runs share that point, so the drawn line
 * stays continuous, without a gap. A value equal to the threshold counts as above.
 */
export function splitAtThreshold(
  points: ReadonlyArray<PlotPoint>,
  threshold: number,
): ThresholdRun[] {
  const first = points[0];
  if (first === undefined) return [];
  let current: ThresholdRun = { below: first.value < threshold, points: [first] };
  const runs: ThresholdRun[] = [current];

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const point = points[index];
    if (previous === undefined || point === undefined) continue;
    const below = point.value < threshold;
    if (below !== current.below) {
      const ratio = (threshold - previous.value) / (point.value - previous.value);
      const crossing = { value: threshold, x: previous.x + ratio * (point.x - previous.x) };
      current.points.push(crossing);
      current = { below, points: [crossing] };
      runs.push(current);
    }
    current.points.push(point);
  }

  return runs;
}

/**
 * Indexes of the intermediate X-axis ticks, between the ends (which already have labels): one third
 * and two thirds of the series. Series too short get no tick, so an end is never repeated.
 */
export function intermediateTickIndexes(count: number): number[] {
  const last = count - 1;
  const ticks = [Math.round(last / 3), Math.round((last * 2) / 3)];

  return ticks.filter((tick, index) => tick > 0 && tick < last && ticks.indexOf(tick) === index);
}

/**
 * Sparkline of a projected value against a threshold: 2 px line in neutral ink, dashed threshold
 * line and the stretch below it in red, with a dot at the end point and its value in the date
 * caption ("$8,000 on 12/05"). The Y axis runs from the highest value down to the lowest projected
 * one; when that valley comes before the end, it gets its own dot and label right below it
 * ("−$18,072.11 on 12/02"), apart from the end label and the threshold label. The line is a single
 * continuous series split at the threshold crossing (`splitAtThreshold`); the X axis marks the
 * ends and the dates at one and two thirds. The SVG stretches to the width (strokes undistorted);
 * labels and dots are HTML positioned by percentage. Each point has a native tooltip on hover;
 * screen readers get `ariaLabel` as text, and the card's reason and details bring the numbers.
 */
export function ForecastSparkline({
  ariaLabel,
  className,
  formatValue,
  points,
  threshold,
  thresholdLabel = "minimum",
}: {
  ariaLabel: string;
  className?: string;
  formatValue: (value: number) => string;
  points: ReadonlyArray<ForecastPoint>;
  threshold: number;
  thresholdLabel?: string;
}) {
  const first = points[0];
  const last = points[points.length - 1];
  if (first === undefined || last === undefined || points.length < 2) return null;

  const values = points.map((point) => point.value);
  const max = Math.max(...values, threshold);
  const min = Math.min(...values, threshold);
  const span = max - min || 1;
  const x = (index: number) => (index / (points.length - 1)) * 100;
  // 0 = top; PAD leaves room for the dot and the strokes.
  const valley = valleyIndex(values);
  const low = valley === null ? undefined : points[valley];
  const bottom = low === undefined ? PAD : VALLEY_PAD;
  const y = (value: number) => PAD + ((max - value) / span) * (100 - PAD - bottom);
  const runs = splitAtThreshold(
    points.map((point, index) => ({ value: point.value, x: x(index) })),
    threshold,
  );
  const thresholdY = y(threshold);
  const lastBelow = last.value < threshold;
  const ticks = intermediateTickIndexes(points.length);

  return (
    <figure className={cn("@container flex flex-col gap-1", className)}>
      <p className="sr-only">{ariaLabel}</p>
      <div aria-hidden="true" className={cn("relative", low === undefined ? "h-16" : "h-20")}>
        <svg
          aria-hidden="true"
          className="absolute inset-0 size-full overflow-visible"
          preserveAspectRatio="none"
          viewBox="0 0 100 100"
        >
          <line
            stroke="var(--muted-foreground)"
            strokeDasharray="4 3"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
            x1={0}
            x2={100}
            y1={thresholdY}
            y2={thresholdY}
          />
          {runs.map((run) => (
            <path
              d={run.points
                .map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${y(point.value)}`)
                .join(" ")}
              data-below={run.below || undefined}
              fill="none"
              key={`${run.below ? "below" : "above"}-${run.points[0]?.x ?? 0}`}
              stroke={run.below ? "var(--negative)" : "var(--foreground)"}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
        <span
          className="absolute left-0 -translate-y-full pb-0.5 text-caption text-muted-foreground tabular-nums"
          style={{ top: `${thresholdY}%` }}
        >
          {thresholdLabel} {formatValue(threshold)}
        </span>
        <span
          aria-hidden="true"
          className={cn(
            "absolute size-2 -translate-1/2 rounded-full ring-2 ring-card",
            lastBelow ? "bg-negative" : "bg-foreground",
          )}
          style={{ left: "100%", top: `${y(last.value)}%` }}
        />
        {low !== undefined && valley !== null ? (
          <>
            <span
              className={cn(
                "absolute size-2 -translate-1/2 rounded-full ring-2 ring-card",
                low.value < threshold ? "bg-negative" : "bg-foreground",
              )}
              data-valley-dot=""
              style={{ left: `${x(valley)}%`, top: `${y(low.value)}%` }}
            />
            <span
              className={cn(
                "absolute pt-1.5 text-caption whitespace-nowrap text-muted-foreground tabular-nums",
                // Near the ends the label hugs the edge instead of leaving the card.
                x(valley) < 15
                  ? "-translate-x-1"
                  : x(valley) > 85
                    ? "-translate-x-full"
                    : "-translate-x-1/2",
              )}
              data-valley-label=""
              style={{ left: `${x(valley)}%`, top: `${y(low.value)}%` }}
            >
              <span
                className={cn(
                  "font-semibold",
                  low.value < threshold ? "text-negative" : "text-foreground",
                )}
              >
                {formatValue(low.value)}
              </span>{" "}
              on {low.label}
            </span>
          </>
        ) : null}
        {points.map((point, index) => (
          <span
            className="absolute h-full w-3 -translate-x-1/2"
            key={point.date}
            style={{ left: `${x(index)}%`, top: 0 }}
            title={`${point.label}: ${formatValue(point.value)}`}
          />
        ))}
      </div>
      <figcaption className="relative flex justify-between text-caption text-muted-foreground tabular-nums">
        <time dateTime={first.date}>{first.label}</time>
        {ticks.map((tick, index) => {
          const point = points[tick];
          if (point === undefined) return null;

          return (
            <time
              className={cn(
                "absolute top-0 -translate-x-1/2 whitespace-nowrap",
                // In a narrow card the second tick would touch the end value.
                index > 0 && "hidden @md:block",
              )}
              dateTime={point.date}
              key={point.date}
              style={{ left: `${x(tick)}%` }}
            >
              {point.label}
            </time>
          );
        })}
        <span>
          <span className={cn("font-semibold", lastBelow ? "text-negative" : "text-foreground")}>
            {formatValue(last.value)}
          </span>{" "}
          on <time dateTime={last.date}>{last.label}</time>
        </span>
      </figcaption>
    </figure>
  );
}
