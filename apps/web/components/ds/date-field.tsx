"use client";

// Calendar with the APG grid pattern (table role="grid", one day with tabindex 0 and arrow keys):
// the table becomes an interactive grid and the cells outside the month stay empty, without a label.
/* oxlint-disable jsx-a11y/no-noninteractive-element-to-interactive-role, jsx-a11y/control-has-associated-label */

import { Popover } from "@base-ui/react/popover";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { type KeyboardEvent, useEffect, useId, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { POPUP_CLASS } from "./popup";

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/u;
const TYPED_DATE = /^(\d{2})\/(\d{2})\/(\d{4})$/u;

/** The calendar week starts on Sunday. */
const WEEKDAYS = [
  { letter: "S", name: "Sunday" },
  { letter: "M", name: "Monday" },
  { letter: "T", name: "Tuesday" },
  { letter: "W", name: "Wednesday" },
  { letter: "T", name: "Thursday" },
  { letter: "F", name: "Friday" },
  { letter: "S", name: "Saturday" },
] as const;

const monthCaption = new Intl.DateTimeFormat("en-US", {
  month: "long",
  timeZone: "UTC",
  year: "numeric",
});
const dayName = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
  weekday: "long",
  year: "numeric",
});

function utc(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** A date that exists in the calendar (02/31 does not). */
function isRealDate(year: number, month: number, day: number): boolean {
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

/** `2026-10-15` → `10/15/2026`; empty stays empty. */
export function isoToTyped(iso: string): string {
  const match = ISO_DATE.exec(iso);

  return match === null ? "" : `${match[2]}/${match[3]}/${match[1]}`;
}

/** `10/15/2026` → `2026-10-15`; `null` when the date is incomplete or does not exist. */
export function typedToIso(text: string): string | null {
  const match = TYPED_DATE.exec(text);

  if (match === null) {
    return null;
  }

  const [, month = "", day = "", year = ""] = match;

  return isRealDate(Number(year), Number(month), Number(day)) ? `${year}-${month}-${day}` : null;
}

/**
 * mm/dd/yyyy mask while typing: keeps only the digits (up to eight) and adds the slash after the
 * month and the day. The slash only appears with the next digit, so Backspace never gets stuck on it.
 */
export function maskTypedDate(raw: string): string {
  const digits = raw.replace(/\D/gu, "").slice(0, 8);

  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;

  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function addDays(iso: string, days: number): string {
  const date = utc(iso);
  date.setUTCDate(date.getUTCDate() + days);

  return toIso(date);
}

/** Same day `months` later, on the last day of the month when it is shorter (01/31 → 02/28). */
export function addMonths(iso: string, months: number): string {
  const date = utc(iso);
  const day = date.getUTCDate();
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));

  return toIso(target);
}

function clamp(iso: string, min: string | undefined, max: string | undefined): string {
  if (min !== undefined && iso < min) return min;
  if (max !== undefined && iso > max) return max;

  return iso;
}

function inRange(iso: string, min: string | undefined, max: string | undefined): boolean {
  return (min === undefined || iso >= min) && (max === undefined || iso <= max);
}

/** Today in the browser's local date, as YYYY-MM-DD. */
function localToday(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${now.getFullYear()}-${month}-${day}`;
}

type DayCell = { day: string | null; key: string };

/** Weeks of the month of `iso` (Sunday to Saturday), with `day: null` on days outside the month. */
function monthWeeks(iso: string): DayCell[][] {
  const first = `${iso.slice(0, 7)}-01`;
  const start = utc(first);
  const days = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)).getUTCDate();
  const cells: DayCell[] = Array.from({ length: start.getUTCDay() }, (_, index) => ({
    day: null,
    key: `before-${index}`,
  }));

  for (let day = 0; day < days; day += 1) {
    const date = addDays(first, day);
    cells.push({ day: date, key: date });
  }
  for (let index = 0; cells.length % 7 !== 0; index += 1) {
    cells.push({ day: null, key: `after-${index}` });
  }

  const weeks: DayCell[][] = [];
  for (let index = 0; index < cells.length; index += 7) {
    weeks.push(cells.slice(index, index + 7));
  }

  return weeks;
}

function caption(iso: string): string {
  return monthCaption.format(utc(iso));
}

/**
 * Date field in place of `<input type="date">`, which shows the browser's own format and icon.
 * Typeable mm/dd/yyyy field (32 px, masked while typing) and a calendar in a popover (Base UI)
 * opened by the icon: the week starts on Sunday; arrows move a day or a week, PageUp and PageDown a
 * month (with Shift, a year), Home and End go to the start and end of the week, Enter picks and Esc
 * closes. With `name`, a hidden field carries the value as YYYY-MM-DD to `FormData` (an incomplete
 * or non-existent date goes as typed, so server validation can point at it). Controlled (`value` +
 * `onValueChange`) or uncontrolled (`defaultValue`, restored on form `reset`). Link the label with
 * `<Label htmlFor={id}>`.
 */
export function DateField({
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  className,
  defaultValue,
  disabled = false,
  id,
  max,
  min,
  name,
  onValueChange,
  placeholder = "mm/dd/yyyy",
  required,
  value,
}: {
  "aria-describedby"?: string | undefined;
  "aria-invalid"?: boolean | "true" | "false" | undefined;
  className?: string;
  /** Initial YYYY-MM-DD when uncontrolled, or "". */
  defaultValue?: string;
  disabled?: boolean;
  id: string;
  /** Last accepted date, YYYY-MM-DD. */
  max?: string | undefined;
  /** First accepted date, YYYY-MM-DD. */
  min?: string | undefined;
  /** Name of the hidden field read by `FormData`. */
  name?: string;
  /** Receives YYYY-MM-DD when the typed date becomes complete and valid, or "" when cleared. */
  onValueChange?: (iso: string) => void;
  placeholder?: string;
  required?: boolean;
  /** Controlled YYYY-MM-DD, or "" for no date. */
  value?: string;
}) {
  const [text, setText] = useState(() => isoToTyped(value ?? defaultValue ?? ""));
  const [syncedValue, setSyncedValue] = useState(value);
  const [touched, setTouched] = useState(false);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(() => clamp(localToday(), min, max));
  const inputRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLTableElement>(null);
  const focusDay = useRef(false);
  const captionId = useId();

  // Controlled value changed from outside (another field, parent reset): the text follows.
  if (value !== syncedValue) {
    setSyncedValue(value);
    if (value !== undefined && value !== typedToIso(text)) {
      setText(isoToTyped(value));
    }
  }

  const parsed = typedToIso(text);
  const valid = text === "" || (parsed !== null && inRange(parsed, min, max));
  const submitted = text === "" ? "" : (parsed ?? text);
  const invalid =
    ariaInvalid === true || ariaInvalid === "true" || (touched && !valid) ? true : undefined;
  const today = localToday();

  // Uncontrolled, the form's `reset()` restores the initial value, like the native field.
  const initial = defaultValue ?? "";
  const controlled = value !== undefined;
  useEffect(() => {
    const form = inputRef.current?.form;
    if (controlled || form === null || form === undefined) return undefined;

    function onReset() {
      setText(isoToTyped(initial));
      setTouched(false);
    }
    form.addEventListener("reset", onReset);

    return () => form.removeEventListener("reset", onReset);
  }, [controlled, initial]);

  // After moving with the keyboard, focus follows the day (which may be in another month).
  useEffect(() => {
    if (!open || !focusDay.current) return;
    focusDay.current = false;
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-date="${focused}"]`)?.focus();
  }, [focused, open]);

  // Only reports complete, valid dates (or the cleared field): reporting mid-typing would make a
  // controlled parent send back a value that erases what is being typed.
  function commit(nextText: string) {
    const before = text === "" ? "" : typedToIso(text);
    const after = nextText === "" ? "" : typedToIso(nextText);
    setText(nextText);
    if (after !== null && after !== before && (after === "" || inRange(after, min, max))) {
      onValueChange?.(after);
    }
  }

  function openChange(next: boolean) {
    if (next) {
      setFocused(clamp(parsed ?? today, min, max));
    }
    setOpen(next);
  }

  function choose(iso: string) {
    if (!inRange(iso, min, max)) return;
    commit(isoToTyped(iso));
    setTouched(false);
    setOpen(false);
  }

  function move(next: string) {
    focusDay.current = true;
    setFocused(clamp(next, min, max));
  }

  function onGridKeyDown(event: KeyboardEvent<HTMLTableElement>) {
    const weekday = utc(focused).getUTCDay();
    const moves: Record<string, () => string> = {
      ArrowDown: () => addDays(focused, 7),
      ArrowLeft: () => addDays(focused, -1),
      ArrowRight: () => addDays(focused, 1),
      ArrowUp: () => addDays(focused, -7),
      End: () => addDays(focused, 6 - weekday),
      Home: () => addDays(focused, -weekday),
      PageDown: () => (event.shiftKey ? addMonths(focused, 12) : addMonths(focused, 1)),
      PageUp: () => (event.shiftKey ? addMonths(focused, -12) : addMonths(focused, -1)),
    };
    const next = moves[event.key];

    if (next !== undefined) {
      event.preventDefault();
      move(next());
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      choose(focused);
    }
  }

  function showMonth(months: number) {
    setFocused(clamp(addMonths(focused, months), min, max));
  }

  const firstOfMonth = `${focused.slice(0, 7)}-01`;
  const prevDisabled = min !== undefined && addDays(firstOfMonth, -1) < min;
  const nextDisabled = max !== undefined && addMonths(firstOfMonth, 1) > max;

  return (
    <div className={cn("relative w-full min-w-0", className)}>
      <Input
        aria-describedby={ariaDescribedBy}
        aria-invalid={invalid}
        autoComplete="off"
        className="pr-9 tabular-nums"
        disabled={disabled}
        id={id}
        inputMode="numeric"
        maxLength={10}
        onBlur={() => setTouched(true)}
        onChange={(event) => {
          setTouched(false);
          commit(maskTypedDate(event.target.value));
        }}
        placeholder={placeholder}
        ref={inputRef}
        required={required}
        value={text}
      />
      {name === undefined ? null : (
        <input disabled={disabled} name={name} type="hidden" value={submitted} />
      )}
      <Popover.Root onOpenChange={openChange} open={open}>
        <Popover.Trigger
          aria-label="Pick from the calendar"
          className="absolute top-1/2 right-1 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={disabled}
        >
          <CalendarDays aria-hidden="true" className="size-4" />
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner align="end" className="z-50" sideOffset={6}>
            <Popover.Popup
              aria-labelledby={captionId}
              className={cn(POPUP_CLASS, "w-[17rem] p-3")}
              initialFocus={() =>
                gridRef.current?.querySelector<HTMLButtonElement>(`[data-date="${focused}"]`) ??
                true
              }
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <button
                  aria-label="Previous month"
                  className="flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={prevDisabled}
                  onClick={() => showMonth(-1)}
                  type="button"
                >
                  <ChevronLeft aria-hidden="true" className="size-4" />
                </button>
                <p aria-live="polite" className="text-body font-semibold" id={captionId}>
                  {caption(focused)}
                </p>
                <button
                  aria-label="Next month"
                  className="flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={nextDisabled}
                  onClick={() => showMonth(1)}
                  type="button"
                >
                  <ChevronRight aria-hidden="true" className="size-4" />
                </button>
              </div>
              <table
                aria-labelledby={captionId}
                className="w-full border-collapse"
                onKeyDown={onGridKeyDown}
                ref={gridRef}
                role="grid"
              >
                <thead>
                  <tr>
                    {WEEKDAYS.map((weekday) => (
                      <th
                        abbr={weekday.name}
                        className="h-8 text-center text-caption font-medium text-muted-foreground"
                        key={weekday.name}
                        scope="col"
                      >
                        {weekday.letter}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {monthWeeks(focused).map((week) => (
                    <tr key={week.map((cell) => cell.key).join()}>
                      {week.map(({ day, key }) =>
                        day === null ? (
                          <td key={key} />
                        ) : (
                          <td aria-selected={day === parsed} className="p-0 text-center" key={key}>
                            <button
                              aria-current={day === today ? "date" : undefined}
                              aria-label={dayName.format(utc(day))}
                              className={cn(
                                "mx-auto flex size-8 items-center justify-center rounded-md text-body tabular-nums outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40",
                                day === today && "font-semibold underline underline-offset-4",
                                day === parsed &&
                                  "bg-primary text-primary-foreground hover:bg-primary/90",
                              )}
                              data-date={day}
                              disabled={!inRange(day, min, max)}
                              onClick={() => choose(day)}
                              tabIndex={day === focused ? 0 : -1}
                              type="button"
                            >
                              {Number(day.slice(8))}
                            </button>
                          </td>
                        ),
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
