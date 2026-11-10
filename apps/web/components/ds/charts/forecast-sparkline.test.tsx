import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { formatCurrency } from "../format";
import {
  ForecastSparkline,
  intermediateTickIndexes,
  splitAtThreshold,
  valleyIndex,
} from "./forecast-sparkline";

afterEach(cleanup);

describe("splitAtThreshold", () => {
  it("cuts each crossing at the exact intersection, shared by both runs", () => {
    const runs = splitAtThreshold(
      [
        { value: 500, x: 0 },
        { value: 1_500, x: 50 },
        { value: 500, x: 100 },
      ],
      1_000,
    );

    expect(runs.map((run) => run.below)).toEqual([true, false, true]);
    expect(runs[0]?.points).toEqual([
      { value: 500, x: 0 },
      { value: 1_000, x: 25 },
    ]);
    expect(runs[1]?.points).toEqual([
      { value: 1_000, x: 25 },
      { value: 1_500, x: 50 },
      { value: 1_000, x: 75 },
    ]);
    expect(runs[2]?.points).toEqual([
      { value: 1_000, x: 75 },
      { value: 500, x: 100 },
    ]);
  });

  it("leaves no gap: every run starts where the previous one ends", () => {
    // A balance just above the minimum: this is the band that used to vanish from the drawing.
    const values = [600, 640, 660, 655, 700, 680, 670, 720, 690, 100];
    const runs = splitAtThreshold(
      values.map((value, index) => ({ value, x: index * 10 })),
      651,
    );

    for (let index = 1; index < runs.length; index += 1) {
      expect(runs[index]?.points[0]).toEqual(runs[index - 1]?.points.at(-1));
    }
    expect(runs.flatMap((run) => run.points.slice(1)).length + 1).toBe(
      values.length + runs.length - 1,
    );
  });

  it("keeps a series that never crosses in one run and counts the threshold itself as above", () => {
    expect(
      splitAtThreshold(
        [
          { value: 1_000, x: 0 },
          { value: 2_000, x: 100 },
        ],
        1_000,
      ),
    ).toEqual([
      {
        below: false,
        points: [
          { value: 1_000, x: 0 },
          { value: 2_000, x: 100 },
        ],
      },
    ]);
    expect(splitAtThreshold([], 1_000)).toEqual([]);
  });
});

describe("intermediateTickIndexes", () => {
  it("marks one and two thirds of the series, never an end", () => {
    expect(intermediateTickIndexes(31)).toEqual([10, 20]);
    expect(intermediateTickIndexes(4)).toEqual([1, 2]);
    expect(intermediateTickIndexes(3)).toEqual([1]);
    expect(intermediateTickIndexes(2)).toEqual([]);
  });
});

describe("valleyIndex", () => {
  it("marks the lowest point only when it is not the end of the series", () => {
    expect(valleyIndex([5, 1, 3])).toBe(1);
    // Flat valley: the first time the lowest value appears.
    expect(valleyIndex([5, 1, 1, 3])).toBe(1);
    // The end already has a label: no repeated mark.
    expect(valleyIndex([5, 3, 1])).toBeNull();
    expect(valleyIndex([5, 1, 4, 1])).toBeNull();
    expect(valleyIndex([1])).toBeNull();
  });
});

describe("ForecastSparkline", () => {
  const points = [
    { date: "2026-11-05", label: "11/05", value: 6_000 },
    { date: "2026-11-15", label: "11/15", value: 7_000 },
    { date: "2026-11-25", label: "11/25", value: 7_200 },
    { date: "2026-12-02", label: "12/02", value: -18_000 },
  ];

  it("draws one continuous line split at the threshold, without clipping", () => {
    const { container } = render(
      <ForecastSparkline
        ariaLabel="Projected balance"
        formatValue={formatCurrency}
        points={points}
        threshold={6_512.88}
      />,
    );
    const paths = [...container.querySelectorAll("path")];

    expect(container.querySelector("clipPath")).toBeNull();
    expect(paths.map((path) => path.hasAttribute("data-below"))).toEqual([true, false, true]);
    for (let index = 1; index < paths.length; index += 1) {
      const start = paths[index]?.getAttribute("d")?.split(" ")[0]?.slice(1);
      const end = paths[index - 1]?.getAttribute("d")?.split(" ").at(-1)?.slice(1);
      expect(start).toBe(end);
    }
  });

  it("labels intermediate dates on the X axis besides the ends", () => {
    render(
      <ForecastSparkline
        ariaLabel="Projected balance"
        formatValue={formatCurrency}
        points={points}
        threshold={6_512.88}
      />,
    );

    expect(screen.getByText("11/05")).toHaveAttribute("datetime", "2026-11-05");
    expect(screen.getByText("11/15")).toHaveAttribute("datetime", "2026-11-15");
    expect(screen.getByText("11/25")).toHaveAttribute("datetime", "2026-11-25");
    expect(screen.getByText("12/02")).toHaveAttribute("datetime", "2026-12-02");
  });

  it("scales down to the lowest projected value and labels that valley apart from the end", () => {
    // Drops to −$18,072.11 on 12/02 and ends at −$3,742.11 on 12/05.
    const series = [
      { date: "2026-11-05", label: "11/05", value: 519.61 },
      { date: "2026-11-25", label: "11/25", value: 20_000 },
      { date: "2026-12-02", label: "12/02", value: -18_072.11 },
      { date: "2026-12-05", label: "12/05", value: -3_742.11 },
    ];
    const { container } = render(
      <ForecastSparkline
        ariaLabel="Projected balance"
        formatValue={formatCurrency}
        points={series}
        threshold={6_512.88}
      />,
    );

    const dot = container.querySelector<HTMLElement>("[data-valley-dot]");
    const label = container.querySelector<HTMLElement>("[data-valley-label]");
    expect(label?.textContent).toBe(`${formatCurrency(-18_072.11)} on 12/02`);
    expect(dot).toHaveClass("bg-negative");
    // The valley stays inside the drawing, above the room kept for the label (nothing cut at the bottom).
    const top = Number.parseFloat(dot?.style.top ?? "");
    expect(top).toBeGreaterThan(60);
    expect(top).toBeLessThanOrEqual(74);
    expect(dot?.style.left).toBe(label?.style.left);
    // The end keeps its own label, in the caption.
    expect(container.querySelector("figcaption")?.textContent).toContain(
      `${formatCurrency(-3_742.11)} on 12/05`,
    );
    expect(container.querySelector("figcaption")).not.toHaveTextContent("18,072.11");
  });

  it("does not repeat the valley label when the series ends at its lowest", () => {
    const { container } = render(
      <ForecastSparkline
        ariaLabel="Projected balance"
        formatValue={formatCurrency}
        points={points}
        threshold={6_512.88}
      />,
    );

    expect(container.querySelector("[data-valley-label]")).toBeNull();
    expect(container.querySelector("[data-valley-dot]")).toBeNull();
  });
});
