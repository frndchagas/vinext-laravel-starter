"use client";

import { useState, type RefCallback } from "react";

const NICE_STEPS = [1, 2, 2.5, 5, 10] as const;

/** Round tick marks covering [min, max] with about `count` intervals. */
export function niceTicks(min: number, max: number, count = 4): number[] {
  const low = Math.min(min, max);
  const high = Math.max(min, max) === low ? low + 100 : Math.max(min, max);
  const rough = (high - low) / count;
  const power = 10 ** Math.floor(Math.log10(rough));
  const step = (NICE_STEPS.find((multiplier) => multiplier * power >= rough) ?? 10) * power;
  const start = Math.floor(low / step) * step;
  const end = Math.ceil(high / step) * step;
  const ticks: number[] = [];

  for (let tick = start; tick <= end + step / 2; tick += step) {
    ticks.push(Math.round(tick));
  }

  return ticks;
}

/** Rectangle with rounded corners only at the data end (the baseline side stays flat). */
export function barPath(x: number, baseline: number, end: number, width: number): string {
  const height = Math.abs(baseline - end);
  if (height < 0.5) return "";

  const radius = Math.min(4, width / 2, height);
  const up = end < baseline;
  const tip = up ? end + radius : end - radius;

  return [
    `M${x},${baseline}`,
    `V${tip}`,
    `Q${x},${end} ${x + radius},${end}`,
    `H${x + width - radius}`,
    `Q${x + width},${end} ${x + width},${tip}`,
    `V${baseline}`,
    "Z",
  ].join(" ");
}

/** Element width, measured with ResizeObserver (initial value until the first measurement). */
export function useElementWidth<T extends HTMLElement>(initial = 640): [RefCallback<T>, number] {
  const [width, setWidth] = useState(initial);

  const ref: RefCallback<T> = (node) => {
    if (node === null || typeof ResizeObserver === "undefined") return undefined;

    const observer = new ResizeObserver(([entry]) => {
      if (entry !== undefined) setWidth(Math.max(Math.round(entry.contentRect.width), 120));
    });
    observer.observe(node);

    return () => observer.disconnect();
  };

  return [ref, width];
}
