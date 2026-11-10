import { describe, expect, it } from "vitest";

import {
  formatAxisCurrency,
  formatAxisNumber,
  formatCurrency,
  formatMonthShort,
  formatPercentPrecise,
  shiftMonth,
} from "./format";

describe("format", () => {
  it("formats currency with cents, a typographic minus and an optional plus", () => {
    expect(formatCurrency(1234.5)).toBe("$1,234.50");
    expect(formatCurrency(-300)).toBe("−$300.00");
    expect(formatCurrency(500, { signed: true })).toBe("+$500.00");
    expect(formatCurrency(0, { signed: true })).toBe("$0.00");
    expect(formatCurrency(19.99, { currency: "EUR" })).toBe("€19.99");
  });

  it("compacts axis labels only", () => {
    expect(formatAxisCurrency(950)).toBe("$950");
    expect(formatAxisCurrency(12_000)).toBe("$12K");
    expect(formatAxisCurrency(-1_200_000)).toBe("−$1.2M");
    expect(formatAxisNumber(3_400)).toBe("3.4K");
  });

  it("signs precise percentages except zero", () => {
    expect(formatPercentPrecise(0.035)).toBe("+3.5%");
    expect(formatPercentPrecise(-0.019)).toBe("−1.9%");
    expect(formatPercentPrecise(0)).toBe("0.0%");
  });

  it("walks months without a time zone", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(formatMonthShort("2026-02")).toBe("Feb 2026");
  });
});
