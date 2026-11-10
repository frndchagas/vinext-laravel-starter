import { describe, expect, it } from "vitest";

import { barPath, niceTicks } from "./scale";

describe("niceTicks", () => {
  it("covers the range with round steps", () => {
    expect(niceTicks(0, 950)).toEqual([0, 250, 500, 750, 1000]);
    expect(niceTicks(-120, 80)).toEqual([-150, -100, -50, 0, 50, 100]);
  });

  it("opens a range when min and max are equal", () => {
    expect(niceTicks(0, 0)).toEqual([0, 25, 50, 75, 100]);
  });
});

describe("barPath", () => {
  it("draws nothing for a bar without height and rounds only the data end", () => {
    expect(barPath(0, 100, 100, 10)).toBe("");
    expect(barPath(0, 100, 50, 10)).toMatch(/^M0,100 V54 Q0,50 4,50 H6 Q10,50 10,54 V100 Z$/);
  });
});
