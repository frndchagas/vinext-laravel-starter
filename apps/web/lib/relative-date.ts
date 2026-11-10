const dayOf = (value: string) =>
  Date.UTC(+value.slice(0, 4), +value.slice(5, 7) - 1, +value.slice(8, 10));

const count = new Intl.NumberFormat("en-US");
const absoluteDate = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
  year: "numeric",
});

/** Absolute calendar date (YYYY-MM-DD) as "Oct 30, 2026". */
export function formatCalendarDate(value: string): string {
  return absoluteDate.format(new Date(dayOf(value)));
}

/** Days from `from` to `to` (YYYY-MM-DD), by the calendar: negative when `to` has passed. */
export function daysUntil(from: string, to: string): number {
  return Math.round((dayOf(to) - dayOf(from)) / 86_400_000);
}

export type DueChip = { label: string; tone: "negative" | "attention" | "neutral"; title: string };

/**
 * Due-date chip relative to `today`: "Late 6d" in red, "Today" or "Tomorrow" in amber, "In 11 days"
 * neutral. The absolute date goes in the `title`.
 */
export function dueChip(due: string, today: string): DueChip {
  const days = daysUntil(today, due);
  const absolute = formatCalendarDate(due);

  if (days < 0) {
    const late = -days;
    return {
      label: `Late ${count.format(late)}d`,
      title: `Due ${absolute}, ${late === 1 ? "1 day" : `${count.format(late)} days`} late`,
      tone: "negative",
    };
  }
  if (days === 0) return { label: "Today", title: `Due today, ${absolute}`, tone: "attention" };
  if (days === 1) {
    return { label: "Tomorrow", title: `Due tomorrow, ${absolute}`, tone: "attention" };
  }
  return { label: `In ${count.format(days)} days`, title: `Due ${absolute}`, tone: "neutral" };
}

/** "today", "tomorrow", "yesterday", "in 4 days", "6 days ago" for short sentences (footers). */
export function relativeDay(date: string, today: string): string {
  const days = daysUntil(today, date);
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  return days > 0 ? `in ${count.format(days)} days` : `${count.format(-days)} days ago`;
}
