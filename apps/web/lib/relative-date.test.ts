import { describe, expect, it } from "vitest";

import { daysUntil, dueChip, formatCalendarDate, relativeDay } from "./relative-date";

describe("relative dates", () => {
  it("counts calendar days, past dates negative", () => {
    expect(daysUntil("2026-11-05", "2026-11-16")).toBe(11);
    expect(daysUntil("2026-11-05", "2026-10-30")).toBe(-6);
    expect(daysUntil("2026-10-31", "2026-11-01")).toBe(1);
  });

  it("formats the absolute date in English", () => {
    expect(formatCalendarDate("2026-10-30")).toBe("Oct 30, 2026");
  });

  it("builds the due chip: late in red, today and tomorrow in amber, later neutral", () => {
    expect(dueChip("2026-10-30", "2026-11-05")).toEqual({
      label: "Late 6d",
      title: "Due Oct 30, 2026, 6 days late",
      tone: "negative",
    });
    expect(dueChip("2026-11-04", "2026-11-05")).toMatchObject({
      title: "Due Nov 4, 2026, 1 day late",
    });
    expect(dueChip("2026-11-05", "2026-11-05")).toMatchObject({
      label: "Today",
      tone: "attention",
    });
    expect(dueChip("2026-11-06", "2026-11-05")).toMatchObject({
      label: "Tomorrow",
      tone: "attention",
    });
    expect(dueChip("2026-11-16", "2026-11-05")).toEqual({
      label: "In 11 days",
      title: "Due Nov 16, 2026",
      tone: "neutral",
    });
  });

  it("says short relative days", () => {
    expect(relativeDay("2026-11-05", "2026-11-05")).toBe("today");
    expect(relativeDay("2026-11-06", "2026-11-05")).toBe("tomorrow");
    expect(relativeDay("2026-11-04", "2026-11-05")).toBe("yesterday");
    expect(relativeDay("2026-11-09", "2026-11-05")).toBe("in 4 days");
    expect(relativeDay("2026-10-30", "2026-11-05")).toBe("6 days ago");
  });
});
