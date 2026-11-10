"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

import { formatMonthShort, shiftMonth } from "./format";

/**
 * Months from `max` down to `min` (most recent first), as YYYY-MM. Includes `extra` when it falls
 * outside the range, so the current value never disappears from the list.
 */
export function monthOptions(min: string, max: string, extra?: string): string[] {
  const low = extra !== undefined && extra !== "" && extra < min ? extra : min;
  const high = extra !== undefined && extra !== "" && extra > max ? extra : max;
  const months: string[] = [];

  for (let month = high; month >= low; month = shiftMonth(month, -1)) {
    months.push(month);
  }

  return months;
}

/**
 * Month picker ("Feb 2026") in place of `<input type="month">`, which shows the month in the
 * browser's language. Design-system Select (Base UI) with the months between `min` and `max`;
 * typing "feb" jumps to the month. Link the label with `<Label htmlFor={id}>`.
 */
export function MonthSelect({
  className,
  describedBy,
  disabled,
  id,
  invalid = false,
  max,
  min,
  name,
  onValueChange,
  placeholder = "Choose a month",
  value,
}: {
  className?: string;
  describedBy?: string | undefined;
  disabled?: boolean;
  id: string;
  invalid?: boolean;
  /** Last month of the list, YYYY-MM. */
  max: string;
  /** First month of the list, YYYY-MM. */
  min: string;
  name?: string;
  onValueChange: (month: string) => void;
  placeholder?: string;
  /** YYYY-MM, or "" for no choice. */
  value: string;
}) {
  const items = monthOptions(min, max, value).map((month) => ({
    label: formatMonthShort(month),
    value: month,
  }));

  return (
    <Select
      disabled={disabled}
      items={items}
      name={name}
      onValueChange={(next) => {
        if (typeof next === "string") onValueChange(next);
      }}
      value={value === "" ? null : value}
    >
      <SelectTrigger
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        className={cn("w-full min-w-0 bg-card tabular-nums shadow-card", className)}
        id={id}
      >
        <SelectValue>
          {(selected: unknown) =>
            typeof selected === "string" && selected !== ""
              ? formatMonthShort(selected)
              : placeholder
          }
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {items.map((item) => (
          <SelectItem className="tabular-nums" key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
