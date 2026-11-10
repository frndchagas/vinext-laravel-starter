/**
 * Fictional data for the design system showcase. Every number is invented and exists only to show
 * the components with realistic content: a generic SaaS admin (sign-ups, active users, revenue).
 */
import type { BandPoint } from "@/components/ds/charts/band-line-chart";
import type { ForecastPoint } from "@/components/ds/charts/forecast-sparkline";
import type { GradientDatum } from "@/components/ds/charts/gradient-bar-chart";
import type { PeriodDatum, PeriodPhase } from "@/components/ds/charts/period-bar-chart";
import type { WaterfallRow } from "@/components/ds/charts/waterfall-chart";

const MONTHS = [
  ["2026-05", "May", "May 2026"],
  ["2026-06", "Jun", "June 2026"],
  ["2026-07", "Jul", "July 2026"],
  ["2026-08", "Aug", "August 2026"],
  ["2026-09", "Sep", "September 2026"],
  ["2026-10", "Oct", "October 2026"],
  ["2026-11", "Nov", "November 2026"],
  ["2026-12", "Dec", "December 2026"],
  ["2027-01", "Jan", "January 2027"],
  ["2027-02", "Feb", "February 2027"],
  ["2027-03", "Mar", "March 2027"],
  ["2027-04", "Apr", "April 2027"],
] as const;

/** Current month of the showcase: November 2026. */
const CURRENT_INDEX = 6;

function phaseOf(index: number): PeriodPhase {
  if (index < CURRENT_INDEX) return "past";
  return index === CURRENT_INDEX ? "current" : "forecast";
}

/** Monthly recurring revenue, in dollars. */
const MRR = [62_400, 59_800, 64_100, 70_200, 66_300, 74_800, 68_900];

export const HERO_REVENUE: GradientDatum[] = MONTHS.slice(0, CURRENT_INDEX + 1).map(
  ([key, label, title], index) => ({
    key,
    label,
    title,
    values: { revenue: MRR[index] ?? 0 },
  }),
);

/** Monthly costs by category (stacked bars). */
const COSTS = [
  { infrastructure: 17_950, payroll: 41_200, support: 4_120, tooling: 2_400 },
  { infrastructure: 17_950, payroll: 39_800, support: 3_980, tooling: 2_140 },
  { infrastructure: 18_200, payroll: 40_500, support: 4_050, tooling: 2_380 },
  { infrastructure: 18_200, payroll: 42_100, support: 4_210, tooling: 2_510 },
  { infrastructure: 18_750, payroll: 43_000, support: 4_300, tooling: 2_760 },
  { infrastructure: 18_750, payroll: 44_600, support: 4_460, tooling: 2_980 },
  { infrastructure: 18_350, payroll: 45_200, support: 4_520, tooling: 3_050 },
  { infrastructure: 19_250, payroll: 45_500, support: 4_550, tooling: 3_100 },
  { infrastructure: 19_250, payroll: 45_500, support: 4_550, tooling: 3_150 },
  { infrastructure: 19_250, payroll: 46_000, support: 4_600, tooling: 3_200 },
  { infrastructure: 19_250, payroll: 46_000, support: 4_600, tooling: 3_200 },
  { infrastructure: 19_250, payroll: 46_500, support: 4_650, tooling: 3_250 },
];

export const COSTS_BY_CATEGORY: PeriodDatum[] = MONTHS.map(([key, label, title], index) => ({
  key,
  label,
  phase: phaseOf(index),
  title,
  values: COSTS[index] ?? {},
}));

const RESULT = [
  [62_400, 43_100],
  [59_800, 46_200],
  [64_100, 58_900],
  [70_200, 48_700],
  [66_300, 54_400],
  [74_800, 51_200],
  [68_900, 47_800],
  [71_000, 53_500],
  [69_000, 49_500],
  [69_500, 49_000],
  [70_500, 50_000],
  [71_500, 51_000],
];

export const REVENUE_VS_COSTS: PeriodDatum[] = MONTHS.map(([key, label, title], index) => ({
  key,
  label,
  phase: phaseOf(index),
  title,
  values: { costs: RESULT[index]?.[1] ?? 0, revenue: RESULT[index]?.[0] ?? 0 },
}));

/** Active workspaces, actual then projected with an uncertainty band. */
export const ACTIVE_WORKSPACES: BandPoint[] = [
  { key: "2026-08", label: "Aug", title: "August 2026", value: 4_180 },
  { key: "2026-09", label: "Sep", title: "September 2026", value: 4_520 },
  { key: "2026-10", label: "Oct", title: "October 2026", value: 5_110 },
  { key: "2026-11", label: "Nov", title: "November 2026", value: 5_430 },
  { high: 6_020, key: "2026-12", label: "Dec", low: 5_020, title: "December 2026", value: 5_560 },
  { high: 6_610, key: "2027-01", label: "Jan", low: 4_720, title: "January 2027", value: 5_690 },
  { high: 7_180, key: "2027-02", label: "Feb", low: 4_390, title: "February 2027", value: 5_820 },
  { high: 7_820, key: "2027-03", label: "Mar", low: 4_050, title: "March 2027", value: 5_930 },
];

export const SPARK_SIGNUPS = [62, 60, 64, 70, 66, 75, 69];
export const SPARK_CHURN = [43, 46, 59, 49, 54, 51, 48];
export const SPARK_AI_REQUESTS = [8, 11, 10, 14, 12, 15, 21];

/**
 * Projected API credits from today (Nov 4) to Dec 5, when the monthly batch job runs: 28,450 −
 * 20,450 = 8,000 credits, below the 20,000 reserve.
 */
export const CREDITS_FORECAST: ForecastPoint[] = [
  { date: "2026-11-04", label: "Nov 4", value: 31_200 },
  { date: "2026-11-10", label: "Nov 10", value: 29_800 },
  { date: "2026-11-14", label: "Nov 14", value: 34_100 },
  { date: "2026-11-20", label: "Nov 20", value: 30_400 },
  { date: "2026-11-25", label: "Nov 25", value: 29_200 },
  { date: "2026-12-01", label: "Dec 1", value: 28_450 },
  { date: "2026-12-05", label: "Dec 5", value: 8_000 },
];

export const CREDITS_RESERVE = 20_000;

/** Where October sign-ups came from: each row starts where the previous one ended. */
export const SIGNUP_SOURCES: WaterfallRow[] = [
  {
    key: "organic",
    label: "Organic",
    segments: [{ color: "var(--chart-1)", key: "organic", label: "Organic", value: 1_240 }],
    title: "Organic search",
  },
  {
    key: "referral",
    label: "Referral",
    segments: [{ color: "var(--chart-2)", key: "referral", label: "Referral", value: 680 }],
    title: "Referral links",
  },
  {
    key: "paid",
    label: "Paid",
    segments: [{ color: "var(--chart-3)", key: "paid", label: "Paid", value: 410 }],
    title: "Paid campaigns",
  },
  {
    key: "churned",
    label: "Churned",
    segments: [
      {
        color: "var(--chart-5)",
        detail: "cancelled within 30 days",
        key: "churned",
        label: "Churned",
        value: -190,
      },
    ],
    title: "Churned in the first month",
  },
];
