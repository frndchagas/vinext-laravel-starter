import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { formatCurrency } from "../format";
import { WaterfallChart, type WaterfallRow } from "./waterfall-chart";

/** Yearly report: 2025 sent $85,000.00; 2026 sent $427,407.68 and $4,640.79 came back. */
const rows: WaterfallRow[] = [
  {
    key: "2025",
    label: "2025",
    segments: [{ color: "x", key: "sent", label: "Sent", value: 85_000 }],
    title: "2025",
  },
  {
    key: "2026",
    label: "2026",
    segments: [
      { color: "x", key: "sent", label: "Sent", value: 427_407.68 },
      { color: "y", key: "returned", label: "Returned", value: -4_640.79 },
    ],
    title: "2026",
  },
];

function renderChart() {
  render(
    <WaterfallChart
      ariaLabel="Yearly report"
      formatValue={(value, options) => formatCurrency(value, options)}
      rows={rows}
      total={{ color: "z", label: "Net balance" }}
    />,
  );
}

/** Makes `useElementWidth` measure `width` px, like a narrow phone. */
function stubWidth(width: number) {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(
        private readonly callback: (entries: Array<{ contentRect: { width: number } }>) => void,
      ) {}
      observe() {
        this.callback([{ contentRect: { width } }]);
      }
      disconnect() {}
      unobserve() {}
    },
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("WaterfallChart", () => {
  it("draws every bar with the same thickness, radius and spacing", () => {
    stubWidth(900);
    renderChart();

    const svg = screen.getByLabelText("Yearly report");
    const bars = [
      ...svg.querySelectorAll<SVGRectElement>("rect[data-step]"),
      ...svg.querySelectorAll<SVGRectElement>("rect[data-total]"),
    ];
    // 2025 (sent), 2026 (sent and returned, in the same band) and the total.
    expect(bars).toHaveLength(4);
    expect(new Set(bars.map((bar) => bar.getAttribute("height")))).toHaveProperty("size", 1);
    expect(new Set(bars.map((bar) => bar.getAttribute("rx")))).toEqual(new Set(["4"]));
    const tops = [...new Set(bars.map((bar) => Number(bar.getAttribute("y"))))];
    expect(tops).toHaveLength(3);
    const [first = 0, second = 0, third = 0] = tops;
    expect(second - first).toBeCloseTo(third - second);
  });

  it("labels each row with its own share of the total, not the running share", () => {
    // Wide enough for the value and the share to sit beside the bar.
    stubWidth(1200);
    renderChart();

    // 85,000.00 ÷ 507,766.89 = 17%; 2026 added 422,766.89 = 83%. No row says 100%.
    expect(screen.getByText(/^\+\$85,000\.00 · 17% of total$/)).toBeInTheDocument();
    expect(screen.getByText(/^\+\$427,407\.68 .*· 83% of total$/)).toBeInTheDocument();
    expect(screen.getByText(/^\$507,766\.89 · 100%$/)).toBeInTheDocument();
    expect(
      screen.getByRole("graphics-symbol", {
        name: /^2026: Sent \$427,407\.68, Returned \$4,640\.79, 83% of total\. Running total \$507,766\.89$/,
      }),
    ).toBeInTheDocument();
  });

  it("keeps the currency value on a narrow screen, with the label above the bar", () => {
    stubWidth(290);
    renderChart();

    expect(screen.getByText(/^\+\$427,407\.68/)).toBeInTheDocument();
    expect(screen.queryByText(/^\d+%$/)).not.toBeInTheDocument();
  });
});
