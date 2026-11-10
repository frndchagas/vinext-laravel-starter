/**
 * Number and date formatting for the design-system components. Kept free of `lib/` so the
 * components can be copied into another app as a unit. Defaults to `en-US` and `USD`; pass a
 * `formatValue` prop to the charts when the product needs another locale or unit.
 */

const LOCALE = "en-US";
/** Typographic minus, so negatives read as a sign and not a hyphen. */
export const MINUS = "−";
/** Non-breaking space: a symbol never ends a line on its own. */
const NBSP = " ";

function keepTogether(text: string): string {
  return text.replace(/\s/g, NBSP);
}

const integer = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 2 });
const compact = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 1, notation: "compact" });
const percent = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0, style: "percent" });
const percentPrecise = new Intl.NumberFormat(LOCALE, {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
  signDisplay: "exceptZero",
  style: "percent",
});
const currencies = new Map<string, Intl.NumberFormat>();

function currencyFormatter(currency: string): Intl.NumberFormat {
  let formatter = currencies.get(currency);
  if (formatter === undefined) {
    formatter = new Intl.NumberFormat(LOCALE, { currency, style: "currency" });
    currencies.set(currency, formatter);
  }
  return formatter;
}

function withSign(formatted: string, value: number, signed: boolean): string {
  if (value < 0) return `${MINUS}${formatted}`;
  if (signed && value > 0) return `+${formatted}`;
  return formatted;
}

export type FormatOptions = { currency?: string; signed?: boolean };

/** "$1,234.56" (always with cents, never rounded); negatives take the typographic minus. */
export function formatCurrency(value: number, options: FormatOptions = {}): string {
  const formatted = currencyFormatter(options.currency ?? "USD").format(Math.abs(value));

  return withSign(keepTogether(formatted), value, options.signed ?? false);
}

/** "1,234.5": plain number with up to two decimals. */
export function formatNumber(value: number, options: { signed?: boolean } = {}): string {
  return withSign(decimal.format(Math.abs(value)), value, options.signed ?? false);
}

/** "1,234": whole number. */
export function formatCount(value: number): string {
  return integer.format(value);
}

/**
 * "$12K", "$1.2M": only for the tick labels of a chart axis. Values in tooltips, legends, tables
 * and KPIs use `formatCurrency` or `formatNumber`.
 */
export function formatAxisCurrency(value: number, currency = "USD"): string {
  const magnitude = Math.abs(value);
  const text = magnitude < 1_000 ? integer.format(magnitude) : compact.format(magnitude);
  const symbol = currencyFormatter(currency)
    .formatToParts(0)
    .find((part) => part.type === "currency");

  return withSign(keepTogether(`${symbol?.value ?? ""}${text}`), value, false);
}

/** "12K", "1.2M": compact axis labels for plain numbers. */
export function formatAxisNumber(value: number): string {
  const magnitude = Math.abs(value);
  const text = magnitude < 1_000 ? integer.format(magnitude) : compact.format(magnitude);

  return withSign(text, value, false);
}

/** "42%" */
export function formatPercent(share: number): string {
  return percent.format(share);
}

/** "+3.5%", "−1.9%": for small rates such as a period-over-period change. */
export function formatPercentPrecise(share: number): string {
  return percentPrecise.format(share).replace("-", MINUS);
}

const shortMonth = new Intl.DateTimeFormat(LOCALE, {
  month: "short",
  timeZone: "UTC",
  year: "numeric",
});
const longMonth = new Intl.DateTimeFormat(LOCALE, {
  month: "long",
  timeZone: "UTC",
  year: "numeric",
});

function monthDate(month: string): Date {
  return new Date(`${month}-01T00:00:00Z`);
}

/** "Feb 2026" from "2026-02". */
export function formatMonthShort(month: string): string {
  return shortMonth.format(monthDate(month));
}

/** "February 2026" from "2026-02". */
export function formatMonthLong(month: string): string {
  return longMonth.format(monthDate(month));
}

/** "2026-02" moved by `delta` months. */
export function shiftMonth(month: string, delta: number): string {
  const [year = 0, value = 1] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, value - 1 + delta, 1));

  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Current month in the browser's time zone, "YYYY-MM". */
export function currentMonth(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}
