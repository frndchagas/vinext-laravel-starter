"use client";

import {
  Activity,
  BadgeCheck,
  Building2,
  CalendarClock,
  ChartColumn,
  Check,
  CheckCheck,
  CircleAlert,
  CircleOff,
  Cloud,
  CreditCard,
  FileText,
  Inbox,
  ListChecks,
  MessageCircleQuestion,
  Palette,
  Pencil,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Upload,
  UserPlus,
  Users,
} from "lucide-react";
import { useId, useState, type ReactNode } from "react";

import { ChartFrame } from "@/components/charts/chart-frame";
import { AiBadge, ConfidenceMeter } from "@/components/ds/ai-mark";
import { ALERT_FRAME_MEASURE, AlertCard } from "@/components/ds/alert-card";
import { Initials } from "@/components/ds/avatar";
import { Card, CardHeader, IconTile, TitledCard } from "@/components/ds/card";
import { BandLineChart } from "@/components/ds/charts/band-line-chart";
import { CHART_SERIES, DonutChart, HERO_RAMP } from "@/components/ds/charts/donut-chart";
import { ForecastSparkline } from "@/components/ds/charts/forecast-sparkline";
import {
  type GradientDatum,
  GradientBarChart,
  HERO_SERIES,
} from "@/components/ds/charts/gradient-bar-chart";
import { PeriodBarChart } from "@/components/ds/charts/period-bar-chart";
import { WaterfallChart } from "@/components/ds/charts/waterfall-chart";
import { type DataColumn, type DataRowGroups, DataTable } from "@/components/ds/data-table";
import { DateField } from "@/components/ds/date-field";
import { Disclosure } from "@/components/ds/disclosure";
import { EmptyState } from "@/components/ds/empty-state";
import { Feed, FeedChip, FeedItem, FeedPeriod, FeedTask } from "@/components/ds/feed";
import {
  formatAxisCurrency,
  formatCount,
  formatCurrency,
  formatNumber,
} from "@/components/ds/format";
import { Greeting, Highlight } from "@/components/ds/greeting";
import { deltaContext, KpiCard, rangeContext } from "@/components/ds/kpi-card";
import { KpiStrip } from "@/components/ds/kpi-strip";
import { MonthSelect } from "@/components/ds/month-select";
import { PageHeader } from "@/components/ds/page-header";
import { CountPill, StatusPill } from "@/components/ds/pill";
import { ProgressBar } from "@/components/ds/progress-bar";
import { RefreshRegion } from "@/components/ds/refresh-region";
import { RowActions, RowPrimaryAction } from "@/components/ds/row-actions";
import { SegmentedControl } from "@/components/ds/segmented-control";
import { Skeleton } from "@/components/ds/skeleton";
import { StatusDot } from "@/components/ds/status-dot";
import { TabPanel, Tabs } from "@/components/ds/tabs";
import { toast } from "@/components/ds/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type Appearance, useAppearance } from "@/lib/appearance";

import {
  ACTIVE_WORKSPACES,
  COSTS_BY_CATEGORY,
  CREDITS_FORECAST,
  CREDITS_RESERVE,
  HERO_REVENUE,
  REVENUE_VS_COSTS,
  SIGNUP_SOURCES,
  SPARK_AI_REQUESTS,
  SPARK_CHURN,
  SPARK_SIGNUPS,
} from "./showcase-data";

const money = (value: number) => formatCurrency(value);
const credits = (value: number) => `${formatNumber(value)} credits`;

const APPEARANCE_OPTIONS = [
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
  { label: "System", value: "system" },
] as const satisfies ReadonlyArray<{ label: string; value: Appearance }>;

const SWATCHES: ReadonlyArray<{
  group: string;
  note: string;
  tokens: ReadonlyArray<{ token: string; label: string }>;
}> = [
  {
    group: "Neutrals",
    note: "Text, borders, buttons and surfaces. Almost everything on screen.",
    tokens: [
      { label: "Canvas", token: "--background" },
      { label: "Card", token: "--card" },
      { label: "Muted", token: "--muted" },
      { label: "Pill", token: "--pill" },
      { label: "Border", token: "--border" },
      { label: "Strong border", token: "--border-strong" },
      { label: "Muted text", token: "--muted-foreground" },
      { label: "Ink", token: "--foreground" },
    ],
  },
  {
    group: "AI and hero chart",
    note: "AI: a violet icon and a thin stroke. Violet and pink as an area only on the hero chart bars.",
    tokens: [
      { label: "AI icon", token: "--ai-ink" },
      { label: "AI stroke", token: "--ai-mark" },
      { label: "Hero start", token: "--ai-from" },
      { label: "Hero end", token: "--ai-to" },
      { label: "Hero 1", token: "--hero-cat-1" },
      { label: "Hero 2", token: "--hero-cat-2" },
      { label: "Hero 3", token: "--hero-cat-3" },
      { label: "Other", token: "--hero-other" },
    ],
  },
  {
    group: "Semantic",
    note: "Only on text, numbers, dots, icons, bars or thin borders. Never as a background.",
    tokens: [
      { label: "Positive", token: "--positive" },
      { label: "Negative", token: "--negative" },
      { label: "Attention (text)", token: "--attention" },
      { label: "Amber (dot and bar)", token: "--attention-mark" },
      { label: "Up series", token: "--revenue" },
      { label: "Down series", token: "--expense" },
      { label: "Focus ring", token: "--ring" },
    ],
  },
  {
    group: "Chart series and accent set",
    note: "Categorical series for parts of a whole, and stable identities for user-created things (tags, saved views).",
    tokens: [
      { label: "Series 1", token: "--chart-1" },
      { label: "Series 2", token: "--chart-2" },
      { label: "Series 3", token: "--chart-3" },
      { label: "Series 4", token: "--chart-4" },
      { label: "Series 5", token: "--chart-5" },
      { label: "Accent 1", token: "--accent-1" },
      { label: "Accent 2", token: "--accent-2" },
      { label: "Accent 3", token: "--accent-3" },
    ],
  },
];

const TYPE_SCALE = [
  { className: "text-hero font-semibold figure", sample: "$68,900", size: "30/36", step: "hero" },
  { className: "text-kpi font-semibold figure", sample: "$15,000", size: "24/28", step: "kpi" },
  {
    className: "text-display",
    sample: "Good morning, Alex!",
    size: "18/24 · 600",
    step: "display",
  },
  { className: "text-title", sample: "Dashboard", size: "18/24 · 600", step: "title" },
  {
    className: "text-heading",
    sample: "API credits run out on Dec 5",
    size: "16/22 · 600",
    step: "heading",
  },
  {
    className: "text-body",
    sample: "Invite from alex@example.com accepted on Oct 14.",
    size: "13/20",
    step: "body",
  },
  {
    className: "text-table tabular-nums",
    sample: "Acme Inc. · Oct 23 · $15,000.00",
    size: "12/16",
    step: "table",
  },
  {
    className: "text-label text-muted-foreground",
    sample: "vs October",
    size: "12/16",
    step: "label",
  },
  {
    className: "text-caption text-muted-foreground",
    sample: "Updated at 9:41",
    size: "11/14",
    step: "caption",
  },
] as const satisfies ReadonlyArray<{
  className: string;
  sample: string;
  size: string;
  step: string;
}>;

/** Writing rules for every text the system generates (docs/design-system.md, "Voice and text"). */
const VOICE_EXAMPLES = [
  { avoid: "AI suggestion: optimize your usage", write: "API credits run out on Dec 5" },
  {
    avoid: "Credits may run low soon",
    write: "Credits drop to 8,000 on Dec 5, below the 20,000 reserve",
  },
  { avoid: "Review · Needs approval", write: "Top up 15,000 credits" },
  {
    avoid: "Smart insights about your team",
    write: "3 invites expired on Nov 2, 2 of them for the Billing role",
  },
] as const;

const VOICE_COLUMNS: ReadonlyArray<DataColumn<(typeof VOICE_EXAMPLES)[number]>> = [
  { cell: (row) => row.write, header: "Write", key: "write" },
  {
    cell: (row) => <span className="text-muted-foreground line-through">{row.avoid}</span>,
    header: "Avoid",
    key: "avoid",
  },
];

const INVOICES = [
  { amount: 15_000, customer: "Acme Inc.", due: "Nov 5", status: "paid" },
  { amount: 15_000, customer: "Globex", due: "Oct 23", status: "late" },
  { amount: 12_800, customer: "Initech", due: "Nov 12", status: "scheduled" },
  { amount: 3_750, customer: "Umbrella Co.", due: "Nov 6", status: "ai" },
  { amount: 10_500, customer: "Stark Labs", due: "Nov 2", status: "scheduled" },
] as const;

type InvoiceRow = (typeof INVOICES)[number];

const INVOICE_STATUS = {
  ai: <AiBadge>Created by AI</AiBadge>,
  late: <StatusPill tone="negative">12 days late</StatusPill>,
  paid: <StatusPill tone="positive">Paid</StatusPill>,
  scheduled: <StatusPill>Scheduled</StatusPill>,
} as const satisfies Record<InvoiceRow["status"], ReactNode>;

const INVOICE_COLUMNS: ReadonlyArray<DataColumn<InvoiceRow>> = [
  {
    cell: (row) => (
      <span className="flex items-center gap-2.5">
        <Initials name={row.customer} />
        <span className="font-medium">{row.customer}</span>
      </span>
    ),
    header: "Customer",
    key: "customer",
  },
  { cell: (row) => row.due, header: "Due", hideOnMobile: true, key: "due" },
  { cell: (row) => INVOICE_STATUS[row.status], header: "Status", key: "status" },
  {
    align: "end",
    cell: (row) => <span className="tabular-nums">{money(row.amount)}</span>,
    header: "Amount",
    key: "amount",
  },
];

const REVENUE_COLUMNS: ReadonlyArray<DataColumn<GradientDatum>> = [
  { cell: (row) => row.title, header: "Month", key: "month" },
  {
    align: "end",
    cell: (row) => money(row.values.revenue ?? 0),
    header: "Revenue",
    key: "value",
  },
];

type EventSample = {
  actor: string | null;
  date: string;
  id: string;
  informative: boolean;
  type: string;
};

/**
 * Audit events of a workspace: years from the most recent to the oldest and, inside a year, the
 * automatic events (informative) in a collapsed group of their own.
 */
const EVENT_SAMPLES: EventSample[] = [
  { actor: "Alex Morgan", date: "2026-11-04", id: "e6", informative: false, type: "Plan changed" },
  { actor: null, date: "2024-01-16", id: "e4", informative: true, type: "Backup" },
  { actor: null, date: "2023-01-13", id: "e1", informative: true, type: "Backup" },
  { actor: null, date: "2023-02-01", id: "e2", informative: true, type: "Backup" },
  { actor: "Sam Lee", date: "2023-03-10", id: "e3", informative: false, type: "Member invited" },
  { actor: null, date: "2023-11-24", id: "e5", informative: true, type: "Key rotated" },
];

const EVENT_COLUMNS: ReadonlyArray<DataColumn<EventSample>> = [
  { cell: (row) => row.date, className: "whitespace-nowrap", header: "Date", key: "date" },
  {
    cell: (row) => (
      <span className="flex items-center gap-1.5">
        {row.type}
        {row.informative ? <StatusPill>automatic</StatusPill> : null}
      </span>
    ),
    header: "Event",
    key: "type",
  },
  {
    cell: (row) => row.actor ?? <span className="text-muted-foreground">—</span>,
    header: "By",
    isEmpty: (row) => row.actor === null,
    key: "actor",
  },
];

const automaticLabel = (count: number) =>
  count === 1 ? "1 automatic event" : `${count} automatic events`;

const EVENT_GROUPS: DataRowGroups<EventSample> = {
  defaultOpen: (group) => group.depth === 0 && group.key === "2026",
  groupOf: (row) => {
    const year = row.date.slice(0, 4);

    return row.informative ? [year, "automatic"] : year;
  },
  summary: ({ depth, key, rows }) => {
    if (depth > 0) return automaticLabel(rows.length);
    const manual = rows.filter((row) => !row.informative).length;
    const automatic = rows.length - manual;

    return [
      key,
      manual > 0 ? `${manual} ${manual === 1 ? "change" : "changes"}` : null,
      automatic > 0 ? automaticLabel(automatic) : null,
    ]
      .filter((part) => part !== null)
      .join(" · ");
  },
  toggleLabel: ({ depth, path, rows }, open) =>
    depth === 0
      ? `${open ? "Collapse" : "Show"} ${rows.length} ${rows.length === 1 ? "event" : "events"} of ${path[0] ?? ""}`
      : `${open ? "Collapse" : "Show"} ${automaticLabel(rows.length)} of ${path[0] ?? ""}`,
};

type OverdueSample = { amount: number; customer: string; due: string; id: string };

/** Overdue invoices: one customer with three (a group) and another with one (a plain row). */
const OVERDUE_SAMPLES: OverdueSample[] = [
  { amount: 3_600, customer: "Globex", due: "Jan 17, 2026", id: "o-1" },
  { amount: 3_600, customer: "Globex", due: "Feb 17, 2026", id: "o-2" },
  { amount: 3_600, customer: "Globex", due: "Mar 17, 2026", id: "o-3" },
  { amount: 3_000, customer: "Initech", due: "Nov 3, 2026", id: "o-4" },
];

const OVERDUE_COLUMNS: ReadonlyArray<DataColumn<OverdueSample>> = [
  {
    cell: (row) => <span className="font-medium">{row.customer}</span>,
    className: "w-full",
    header: "Customer",
    key: "customer",
  },
  { cell: (row) => row.due, header: "Due", key: "due" },
  { align: "end", cell: (row) => money(row.amount), header: "Amount", key: "amount" },
  {
    align: "end",
    cell: () => null,
    className: "w-px",
    header: <span className="sr-only">Actions</span>,
    key: "actions",
  },
];

const OVERDUE_GROUPS: DataRowGroups<OverdueSample> = {
  // With `cells`, the oldest due date, the total and the action sit in the columns, aligned with the rows.
  cells: ({ rows }) => ({
    actions: (
      <RowPrimaryAction
        ariaLabel={`Mark the ${rows.length} overdue invoices of Globex as paid`}
        icon={CheckCheck}
        label="Mark paid"
        onClick={() => toast.success(`${rows.length} invoices marked as paid (example)`)}
      />
    ),
    amount: (
      <span className="font-semibold">{money(rows.reduce((sum, row) => sum + row.amount, 0))}</span>
    ),
    due: rows[0]?.due,
  }),
  defaultOpen: () => true,
  groupOf: (row) => (row.customer === "Globex" ? row.customer : null),
  summary: ({ rows }) => (
    <span className="inline-flex items-center gap-2">
      <span className="text-foreground">Globex</span>
      <span className="font-normal">{rows.length} invoices</span>
    </span>
  ),
  toggleLabel: ({ rows }, open) =>
    `${open ? "Collapse" : "Show"} the ${rows.length} overdue invoices of Globex`,
};

type MemberSample = { id: string; lastSeen: string; name: string; sessions: number };

/** A long list of fictional members, so the sticky header has something to scroll past. */
const MEMBER_SAMPLES: MemberSample[] = Array.from({ length: 24 }, (_, index) => ({
  id: `m-${index}`,
  lastSeen: `Oct ${28 - index}, 2026`,
  name: `Member ${String(index + 1).padStart(2, "0")}`,
  sessions: 48 - index * 2,
}));

const MEMBER_COLUMNS: ReadonlyArray<DataColumn<MemberSample>> = [
  {
    cell: (row) => <span className="font-medium">{row.name}</span>,
    header: "Member",
    key: "name",
  },
  { align: "end", cell: (row) => formatCount(row.sessions), header: "Sessions", key: "sessions" },
  { align: "end", cell: (row) => row.lastSeen, header: "Last seen", key: "last-seen" },
];

const FEED_TABS = [
  { count: 12, countLabel: "items", label: "All", value: "all" },
  {
    count: 4,
    countLabel: "questions",
    icon: Sparkles,
    label: "AI questions",
    value: "questions",
  },
  { count: 8, countLabel: "done", icon: BadgeCheck, label: "Done", value: "done" },
] as const;

type FeedTab = (typeof FEED_TABS)[number]["value"];

const PERIOD_LABELS = {
  month: "This month",
  today: "Today",
  week: "This week",
} as const;

type Period = keyof typeof PERIOD_LABELS;

function isPeriod(value: string | null): value is Period {
  return value === "today" || value === "week" || value === "month";
}

/** Approved alert format: fact and date in the title, numbers, a sparkline and verbs. */
function CreditsAlert() {
  return (
    <AlertCard
      actions={
        <>
          <Button>Top up 15,000 credits</Button>
          {/* The secondary actions wrap together: on a phone, "Ignore" never drops alone. */}
          <span className="flex items-center gap-2">
            <Button variant="outline">Remind me on Dec 1</Button>
            <Button className="px-2" variant="ghost">
              Ignore
            </Button>
          </span>
        </>
      }
      chart={
        <ForecastSparkline
          ariaLabel="Projected API credits: from 31,200 on Nov 4 down to 8,000 on Dec 5, below the 20,000 reserve"
          formatValue={credits}
          points={CREDITS_FORECAST}
          threshold={CREDITS_RESERVE}
          thresholdLabel="reserve"
        />
      }
      details={
        <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 tabular-nums">
          <dt>Projected balance on Dec 4</dt>
          <dd className="text-right text-foreground">28,450</dd>
          <dt>Monthly batch job, Dec 5</dt>
          <dd className="text-right text-foreground">−18,350</dd>
          <dt>Scheduled reports, Dec 5</dt>
          <dd className="text-right text-foreground">−2,100</dd>
          <dt>Balance on Dec 5</dt>
          <dd className="text-right font-medium text-negative">8,000</dd>
          <dt>Reserve</dt>
          <dd className="text-right text-foreground">20,000</dd>
          <dt className="col-span-2 pt-1">
            Calculated by the AI from today&apos;s balance and the scheduled jobs.
          </dt>
        </dl>
      }
      origin="ai"
      reason="The batch job (18,350) and the scheduled reports (2,100) run on the 5th. Without a top-up, the balance drops to 8,000, below the 20,000 reserve."
      title="API credits run out on Dec 5"
    />
  );
}

function Section({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description: string;
  title: string;
}) {
  const id = useId();

  return (
    <section aria-labelledby={id} className="flex flex-col gap-4 border-t border-border pt-8">
      <div className="max-w-2xl">
        <h2 className="text-title" id={id}>
          {title}
        </h2>
        <p className="mt-1 text-body text-pretty text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}

function Specimen({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-caption text-muted-foreground">{label}</p>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

function ColorPalette() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {SWATCHES.map((group) => (
        <Card key={group.group}>
          <div>
            <h3 className="text-heading">{group.group}</h3>
            <p className="text-label text-muted-foreground">{group.note}</p>
          </div>
          <ul className="grid grid-cols-4 gap-3 sm:grid-cols-8">
            {group.tokens.map((swatch) => (
              <li className="flex flex-col gap-1.5" key={swatch.token}>
                <span
                  aria-hidden="true"
                  className="h-10 rounded-lg border border-border"
                  style={{ background: `var(${swatch.token})` }}
                />
                <span className="text-caption leading-tight">{swatch.label}</span>
                <code className="text-[0.625rem] leading-tight break-all text-muted-foreground">
                  {swatch.token}
                </code>
              </li>
            ))}
          </ul>
        </Card>
      ))}
      <Card className="md:col-span-2">
        <div className="flex flex-wrap items-center gap-4">
          <span aria-hidden="true" className="h-10 flex-1 rounded-lg bg-hero-gradient" />
          <p className="max-w-md text-label text-muted-foreground">
            Violet → pink gradient (<code>--hero-gradient</code>): only on the bars of the hero
            chart. Badges, buttons, cards and icons never use a gradient.
          </p>
        </div>
      </Card>
    </div>
  );
}

/** Fires every toast type with texts in the DS voice (docs/design-system.md, "Toast"). */
function ToastShowcase() {
  return (
    <Card className="gap-5">
      <Specimen label="Types">
        <Button onClick={() => toast("Export of October ready")} variant="outline">
          Text
        </Button>
        <Button onClick={() => toast.success("Role applied to 5 members")} variant="outline">
          Success
        </Button>
        <Button
          onClick={() => toast.error("Could not read members.csv: the email column is missing")}
          variant="outline"
        >
          Error
        </Button>
        <Button
          onClick={() => {
            void toast.promise(
              new Promise<number>((resolve) => {
                window.setTimeout(() => resolve(131), 1600);
              }),
              {
                error: "Could not import the members",
                loading: "Importing 3 files…",
                success: (count) => `${count} members imported`,
              },
            );
          }}
          variant="outline"
        >
          Loading → success
        </Button>
      </Specimen>
      <Specimen label="From the design system">
        <Button
          onClick={() =>
            toast.action("5 members moved to Billing", {
              label: "Undo",
              onAction: () => toast("5 members moved back to Support"),
            })
          }
          variant="outline"
        >
          With action
        </Button>
        <Button
          onClick={() => toast.ai("The AI tagged 103 tickets · 7 went to the review queue")}
          variant="outline"
        >
          <Sparkles aria-hidden="true" className="text-ai-ink" />
          AI
        </Button>
        <Button
          onClick={() =>
            toast.action("Card ending 4421 expires in Dec 2026", {
              description: "The subscription renews on the 5th. Update it before then.",
              icon: CreditCard,
              label: "Update card",
              onAction: () => undefined,
            })
          }
          variant="outline"
        >
          Custom
        </Button>
        <Button onClick={() => toast.dismiss()} variant="ghost">
          Close all
        </Button>
      </Specimen>
    </Card>
  );
}

function MiniDashboard() {
  const [view, setView] = useState<"monthly" | "quarterly">("monthly");

  return (
    <div className="flex flex-col gap-stack rounded-[1.5rem] border border-border bg-background p-4 sm:p-page">
      <PageHeader
        icon={ChartColumn}
        notifications={3}
        onNotifications={() => undefined}
        onSearch={() => undefined}
        title="Dashboard"
        titleAs="p"
      />
      <Greeting
        actions={
          <Button variant="outline">
            <Upload aria-hidden="true" />
            Import members
          </Button>
        }
        as="h3"
        hour={9}
        name="Alex"
        summary={
          <>
            Today: <Highlight>4 questions</Highlight> to answer,{" "}
            <Highlight>2 overdue invoices</Highlight> and <Highlight>$12,800</Highlight> due by
            Friday, Nov 6.
          </>
        }
      />
      <KpiStrip
        ariaLabel="November summary"
        items={[
          {
            delta: { comparison: "vs October", detail: "$5,900", ratio: -0.079 },
            icon: TrendingUp,
            key: "revenue",
            label: "Revenue",
            value: money(68_900),
          },
          {
            delta: { comparison: "vs October", polarity: "down-is-good", ratio: -0.066 },
            icon: TrendingDown,
            key: "costs",
            label: "Costs",
            value: money(47_800),
          },
          {
            icon: CalendarClock,
            key: "late",
            label: "Overdue",
            note: "Globex, Umbrella Co.",
            value: money(18_750),
          },
          {
            delta: { comparison: "vs October", ratio: 0.31 },
            icon: Sparkles,
            key: "ai",
            label: "AI requests",
            value: formatCount(21_040),
          },
        ]}
      />
      <div className="grid gap-stack xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <TitledCard
          actions={
            <SegmentedControl
              ariaLabel="Group by"
              onValueChange={setView}
              options={[
                { label: "Monthly", value: "monthly" },
                { label: "Quarterly", value: "quarterly" },
              ]}
              value={view}
            />
          }
          icon={ChartColumn}
          title="Costs by category"
        >
          <PeriodBarChart
            ariaLabel="Costs by category, from May 2026 to April 2027"
            data={COSTS_BY_CATEGORY}
            formatAxis={formatAxisCurrency}
            formatValue={money}
            height={300}
            layout="stacked"
            series={[
              { color: "var(--hero-cat-1)", key: "payroll", label: "Payroll" },
              { color: "var(--hero-cat-2)", key: "infrastructure", label: "Infrastructure" },
              { color: "var(--hero-cat-3)", key: "support", label: "Support" },
              { color: "var(--hero-other)", key: "tooling", label: "Other" },
            ]}
          />
        </TitledCard>
        <TitledCard icon={CircleAlert} title="3 alerts on Nov 4">
          <CreditsAlert />
          <ul aria-label="Items that need attention" className="flex flex-col gap-2 text-body">
            <li className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                <IconTile icon={FileText} size="sm" />
                <span>
                  <span className="font-medium">Globex · Invoice 134</span>
                  <span className="block text-label text-muted-foreground">
                    $15,000, due on Oct 23
                  </span>
                </span>
              </span>
              <StatusDot tone="negative">Late</StatusDot>
            </li>
            <li className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                <IconTile icon={MessageCircleQuestion} size="sm" />
                <span>
                  <span className="font-medium">3 questions about October sign-ups</span>
                  <span className="block text-label text-muted-foreground">
                    Sam, Priya and Jordan
                  </span>
                </span>
              </span>
              <StatusDot tone="ai">Waiting</StatusDot>
            </li>
          </ul>
        </TitledCard>
      </div>
      <TitledCard icon={FileText} title="Invoices due">
        <DataTable
          caption="Invoices due in November"
          columns={INVOICE_COLUMNS}
          rowKey={(row) => row.customer}
          rows={INVOICES}
        />
      </TitledCard>
    </div>
  );
}

function MiniFeed() {
  const [tab, setTab] = useState<FeedTab>("all");
  const [period, setPeriod] = useState<Period>("today");

  return (
    <Card className="gap-0">
      <Tabs ariaLabel="Filter the inbox" onValueChange={setTab} options={FEED_TABS} value={tab}>
        {FEED_TABS.map((option) => (
          <TabPanel key={option.value} value={option.value}>
            <FeedPeriod>
              <Select
                items={PERIOD_LABELS}
                onValueChange={(value) => {
                  if (isPeriod(value)) setPeriod(value);
                }}
                value={period}
              >
                <SelectTrigger aria-label="Period" className="h-9 min-w-28 bg-card shadow-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PERIOD_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FeedPeriod>
            <Feed
              ariaLabel={`Inbox: ${option.label.toLowerCase()}, ${PERIOD_LABELS[period].toLowerCase()}`}
            >
              {option.value !== "done" ? (
                <FeedItem
                  actor="AI"
                  contentClassName={ALERT_FRAME_MEASURE}
                  object={<FeedChip icon={MessageCircleQuestion}>question</FeedChip>}
                  time="2026-11-04T09:41:00Z"
                  timeLabel="9:41"
                  variant="ai"
                  verb="opened a"
                >
                  <AlertCard
                    actions={
                      <>
                        <Button>Merge the accounts</Button>
                        <Button variant="outline">Keep both</Button>
                        <Button variant="ghost">Answer later</Button>
                      </>
                    }
                    confidence={0.64}
                    reason="Both accounts use the same company domain and were created 2 minutes apart on Oct 14. One of them has never signed in."
                    title="Sign-up from acme.com on Oct 14: a duplicate of Acme Inc. or a new team?"
                    variant="plain"
                  />
                </FeedItem>
              ) : null}
              {option.value === "all" ? (
                <FeedItem
                  actor="Import"
                  icon={Inbox}
                  object={<FeedChip icon={FileText}>file</FeedChip>}
                  time="2026-11-04T08:15:00Z"
                  timeLabel="8:15"
                  verb="received a"
                >
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-2 text-body">
                    <IconTile icon={Building2} size="sm" />
                    <span className="font-medium">38 members from October</span>
                    <span className="text-muted-foreground">
                      · 33 matched by rule, 5 became questions
                    </span>
                  </div>
                </FeedItem>
              ) : null}
              {option.value !== "questions" ? (
                <FeedItem
                  actor="Alex"
                  object={<FeedChip icon={ListChecks}>task</FeedChip>}
                  time="2026-11-04T07:58:00Z"
                  timeLabel="7:58"
                  variant="done"
                  verb="completed a"
                >
                  <FeedTask done meta={<StatusPill>Billing</StatusPill>}>
                    Reconcile the October invoices
                  </FeedTask>
                </FeedItem>
              ) : null}
            </Feed>
          </TabPanel>
        ))}
      </Tabs>
    </Card>
  );
}

function RefreshShowcase() {
  const [busy, setBusy] = useState(false);

  return (
    <Card className="gap-4">
      <Specimen label="RefreshRegion">
        <Button onClick={() => setBusy((current) => !current)} size="sm" variant="outline">
          {busy ? "Data arrived" : "Change the filter"}
        </Button>
      </Specimen>
      <RefreshRegion
        announcement="Members of November: list updated"
        busy={busy}
        className="rounded-lg"
      >
        <DataTable
          caption="Members, the previous page stays at 60% while the next one loads"
          columns={MEMBER_COLUMNS}
          rowKey={(row) => row.id}
          rows={MEMBER_SAMPLES.slice(0, 4)}
        />
      </RefreshRegion>
      <ProgressBar
        className="max-w-sm"
        done={18}
        label="Members invited this month"
        total={25}
        valueText="18 of 25 invited"
      />
    </Card>
  );
}

export default function DesignSystemPage() {
  const { appearance, updateAppearance } = useAppearance();
  const [searchHint, setSearchHint] = useState(false);
  const [segment, setSegment] = useState<"month" | "3m" | "12m">("month");
  const [month, setMonth] = useState("2026-10");
  const [date, setDate] = useState("2026-10-15");
  const [loading, setLoading] = useState(true);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        actions={
          <div className="hidden gap-2 md:flex">
            <SegmentedControl
              ariaLabel="Theme"
              onValueChange={updateAppearance}
              options={APPEARANCE_OPTIONS}
              value={appearance}
            />
          </div>
        }
        icon={Palette}
        notifications={2}
        onNotifications={() => undefined}
        onSearch={() => setSearchHint(true)}
        title="Design system"
      />
      <div className="flex flex-wrap gap-2 md:hidden">
        <SegmentedControl
          ariaLabel="Theme"
          onValueChange={updateAppearance}
          options={APPEARANCE_OPTIONS}
          value={appearance}
        />
      </div>
      {searchHint ? (
        <output className="-mt-6 block text-label text-muted-foreground">
          ⌘K opens the global search; in this showcase it only confirms the shortcut.
        </output>
      ) : null}

      <Greeting
        hour={9}
        name="Alex"
        summary={
          <>
            Figtree on a <Highlight>compact</Highlight> scale, white surfaces and colour only where
            it carries meaning: a dot, an icon, a number or a thin stroke.
          </>
        }
      />

      <Section
        description="Roles, not values: components use tokens (CSS variables) and the dark theme swaps the values while keeping the roles."
        title="Colours"
      >
        <ColorPalette />
      </Section>

      <Section
        description="Figtree, the single font. One compact scale: body 13 px, tables 12 px, titles 16 to 18 px, KPIs 24 px. Numbers are always tabular."
        title="Typography"
      >
        <Card className="gap-3">
          {TYPE_SCALE.map((step) => (
            <div
              className="grid gap-1 border-b border-border pb-3 last:border-0 last:pb-0 sm:grid-cols-[11rem_1fr] sm:items-baseline"
              key={step.step}
            >
              <code className="text-caption text-muted-foreground">
                {step.step} · {step.size}
              </code>
              <p className={step.className}>{step.sample}</p>
            </div>
          ))}
        </Card>
      </Section>

      <Section
        description="Primary button near-black; secondary outlined. Pills are always grey with neutral text: the colour lives in the dot or the icon. The row's primary action is a ghost button that gains an outline when the row is hovered or focused."
        title="Controls, pills and states"
      >
        <Card className="gap-5">
          <Specimen label="Buttons">
            <Button>Save rule</Button>
            <Button variant="outline">Import members</Button>
            <Button variant="ghost">Cancel</Button>
            <Button variant="destructive">Revoke access</Button>
            <Button pending pendingLabel="Saving…">
              Save
            </Button>
          </Specimen>
          <Specimen label="Row actions">
            {/* `group/row` as in a DataTable row: the outline shows on hover and on focus. */}
            <div className="group/row flex items-center gap-1 rounded-md py-1 pr-1 pl-3 hover:bg-muted/50">
              <span className="mr-3 text-body tabular-nums">$700.00</span>
              <RowPrimaryAction
                ariaLabel="Mark the invoice of Jan 17, 2026 as paid"
                icon={Check}
                label="Mark paid"
                onClick={() => toast.success("Mark paid chosen")}
              />
              <RowActions
                actions={[
                  {
                    icon: Pencil,
                    key: "edit",
                    label: "Edit invoice",
                    onSelect: () => toast.success("Edit invoice chosen"),
                  },
                  {
                    destructive: true,
                    icon: CircleOff,
                    key: "void",
                    label: "Void invoice",
                    onSelect: () => toast.success("Void invoice chosen"),
                  },
                ]}
                label="More actions for the invoice of Jan 17, 2026"
              />
            </div>
          </Specimen>
          <Specimen label="Field and segmented control">
            <Input aria-label="Description" className="max-w-xs" placeholder="Workspace name" />
            <SegmentedControl
              ariaLabel="Period"
              onValueChange={setSegment}
              options={[
                { label: "This month", short: "Month", value: "month" },
                { label: "3 months", short: "3m", value: "3m" },
                { label: "12 months", short: "12m", value: "12m" },
              ]}
              value={segment}
            />
          </Specimen>
          <Specimen label="Month and collapsed block">
            <div className="flex w-40 flex-col gap-1.5">
              <Label htmlFor="ds-month">Month</Label>
              <MonthSelect
                id="ds-month"
                max="2026-11"
                min="2024-07"
                onValueChange={setMonth}
                value={month}
              />
            </div>
            <Disclosure className="w-full max-w-md" label="How to connect the webhook">
              <p className="text-body text-pretty">
                Paste the signing secret in Settings → Integrations and click Send test event.
              </p>
            </Disclosure>
          </Specimen>
          <Specimen label="Status">
            <StatusPill>Scheduled</StatusPill>
            <StatusPill dot>Disabled</StatusPill>
            <StatusPill tone="positive">Paid</StatusPill>
            <StatusPill tone="negative">12 days late</StatusPill>
            <StatusPill tone="attention">Due on Nov 7</StatusPill>
            <StatusPill tone="ai">Open question</StatusPill>
            <AiBadge>Created by AI</AiBadge>
            {/* Positive state in neutral grey with a check: green belongs to positive numbers. */}
            <StatusDot tone="positive">On time</StatusDot>
            <StatusDot tone="negative">Late</StatusDot>
            <StatusDot tone="attention">To review</StatusDot>
            <StatusDot tone="ai">Waiting</StatusDot>
            <StatusDot tone="neutral">Draft</StatusDot>
          </Specimen>
          <Specimen label="Counters, initials, confidence and numbers">
            <CountPill count={238} label="items" />
            <CountPill count={4} label="open" tone="strong" />
            <CountPill count={4} label="questions" tone="ai" />
            <Initials name="Priya Natarajan" />
            <Initials name="Acme Inc." size="sm" />
            <span className="w-28">
              <ConfidenceMeter confidence={0.64} />
            </span>
            <span className="text-body tabular-nums">{formatCurrency(1_234.56)}</span>
            <span className="text-body text-negative tabular-nums">
              {formatCurrency(-300, { signed: true })}
            </span>
            <span className="text-body text-positive tabular-nums">
              {formatCurrency(500, { signed: true })}
            </span>
            <span className="text-body tabular-nums">
              {formatCurrency(89, { currency: "EUR" })}
            </span>
            <span className="text-body tabular-nums">{formatNumber(21_040.5)}</span>
          </Specimen>
          <Specimen label="Loading">
            <Button onClick={() => setLoading((current) => !current)} size="sm" variant="outline">
              {loading ? "Show content" : "Show skeleton"}
            </Button>
            <div aria-busy={loading} className="flex w-full max-w-md items-center gap-3">
              {loading ? (
                <>
                  <Skeleton className="size-9 rounded-full" />
                  <span className="flex flex-1 flex-col gap-2">
                    <Skeleton className="h-3 w-2/3" />
                    <Skeleton className="h-3 w-1/3" />
                  </span>
                </>
              ) : (
                <>
                  <Initials className="size-9" name="Acme Inc." />
                  <span className="text-body">Acme Inc. · $11,000/month</span>
                </>
              )}
            </div>
          </Specimen>
        </Card>
        <EmptyState
          action={
            <Button variant="outline">
              <Upload aria-hidden="true" />
              Import members
            </Button>
          }
          description="Drop a CSV here. Rows that match a rule are added right away; the rest become questions."
          icon={Inbox}
          title="No imports in November"
        />
      </Section>

      <Section
        description="A date field in place of the native one, which shows the browser's format and icon: type mm/dd/yyyy or open the calendar from the icon. In the calendar, arrows move a day or a week, PageUp and PageDown a month (with Shift, a year), Home and End go to the start and the end of the week, Enter picks and Esc closes. The form receives YYYY-MM-DD."
        title="Date"
      >
        <Card className="gap-5">
          <Specimen label="Date field">
            <div className="flex w-40 flex-col gap-1.5">
              <Label htmlFor="ds-date">Start date</Label>
              <DateField id="ds-date" onValueChange={setDate} value={date} />
            </div>
            <div className="flex w-40 flex-col gap-1.5">
              <Label htmlFor="ds-date-range">A day in November</Label>
              <DateField
                defaultValue="2026-11-05"
                id="ds-date-range"
                max="2026-11-30"
                min="2026-11-01"
              />
            </div>
            <p className="self-end pb-2 text-label text-muted-foreground tabular-nums">
              Submitted value: {date === "" ? "empty" : date}
            </p>
          </Specimen>
        </Card>
      </Section>

      <Section
        description="Fact and date in the title, numbers in the reason, a sparkline of the balance crossing the reserve and verbs on the buttons. The AI origin shows only as a thin violet stroke on the left; the calculation opens under Show calculation."
        title="Alert"
      >
        <div className="grid gap-stack lg:grid-cols-2">
          <CreditsAlert />
          <AlertCard
            actions={
              <>
                <Button>Send reminder</Button>
                <Button variant="outline">Remind me on Nov 10</Button>
              </>
            }
            reason="Invoice 134 of October. Globex paid the last 3 invoices 4 to 9 days late."
            title="Globex has not paid $15,000.00 due on Oct 23"
          />
        </div>
      </Section>

      <Section
        description="Applies to every text the system writes: alerts, questions, summaries, buttons and empty states."
        title="Voice and text"
      >
        <Card className="gap-3">
          <ul className="grid gap-x-6 gap-y-1 text-body sm:grid-cols-2">
            <li>Title with the fact and the date.</li>
            <li>Numbers instead of adjectives.</li>
            <li>Action verb on the button: Top up, Merge, Send.</li>
            <li>Short sentences, one idea each.</li>
          </ul>
          <DataTable
            caption="Writing examples"
            columns={VOICE_COLUMNS}
            rowKey={(row) => row.write}
            rows={VOICE_EXAMPLES}
          />
        </Card>
      </Section>

      <Section
        description="KpiStrip groups sibling numbers in one card; KpiCard isolates a number with context (change, likely range, an alert with a date) or with a sparkline in the colour of its role."
        title="Indicators"
      >
        <div className="grid gap-stack sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            context={deltaContext({ comparison: "vs September", ratio: -0.019 })}
            icon={UserPlus}
            label="Sign-ups, October"
            value={formatCount(2_140)}
          />
          <KpiCard
            context={deltaContext({
              comparison: "vs September",
              polarity: "down-is-good",
              ratio: -0.003,
            })}
            icon={Users}
            label="Churned, October"
            value={formatCount(190)}
          />
          <KpiCard
            context={rangeContext("10.7", "18.6")}
            icon={Activity}
            label="Months of runway"
            value="15.0 months"
          />
          <KpiCard
            context={{ pill: "Dec 5", text: "below the 20,000 reserve", tone: "negative" }}
            icon={CircleAlert}
            label="Lowest projected credits"
            value={formatCount(8_000)}
          />
        </div>
        <div className="grid gap-stack sm:grid-cols-3">
          <KpiCard
            accent="positive"
            context={deltaContext({ comparison: "vs last month", ratio: 0.105 })}
            label="Sign-ups"
            sparkline={SPARK_SIGNUPS}
            value={formatCount(2_140)}
          />
          <KpiCard
            accent="negative"
            context={deltaContext({
              comparison: "vs last month",
              polarity: "down-is-good",
              ratio: -0.0868,
            })}
            label="Churn"
            sparkline={SPARK_CHURN}
            value={formatCount(190)}
          />
          <KpiCard
            accent="ai"
            context={deltaContext({ comparison: "vs last month", ratio: 0.454 })}
            label="AI requests"
            sparkline={SPARK_AI_REQUESTS}
            value={formatCount(21_040)}
          />
        </div>
      </Section>

      <Section
        description="DataTable with groups: secondary rows collapse into a summary row with a chevron, a count and a subtotal; open, every row returns to its place. groupOf can return nested keys (the year and, inside it, the automatic events) and defaultOpen opens a group at the start. With isEmpty, a column disappears when every visible row is empty. With cells, the group row puts content in the table columns, aligned with its rows: oldest due date, total and Mark paid in the actions column."
        title="Table with collapsible groups"
      >
        <Card>
          <DataTable
            caption="Audit events by year, with automatic events set apart"
            columns={EVENT_COLUMNS}
            groups={EVENT_GROUPS}
            rowKey={(row) => row.id}
            rows={EVENT_SAMPLES}
          />
        </Card>
        <Card>
          <DataTable
            caption="Overdue invoices grouped by customer, with Mark paid on the group"
            columns={OVERDUE_COLUMNS}
            groups={OVERDUE_GROUPS}
            rowKey={(row) => row.id}
            rows={OVERDUE_SAMPLES}
          />
        </Card>
      </Section>

      <Section
        description="DataTable with stickyHeader: on long lists the header stays at the top while scrolling, below the app header on phones (--app-sticky-top) and below any other fixed band of the page (stickyOffset). The table stops scrolling horizontally: only for tables that fit the width."
        title="Long table with a sticky header"
      >
        <Card className="p-0">
          <DataTable
            caption="Members, with a sticky header"
            columns={MEMBER_COLUMNS}
            rowKey={(row) => row.id}
            rows={MEMBER_SAMPLES}
            stickyHeader
          />
        </Card>
      </Section>

      <Section
        description="Data that changes with a filter, tab or period keeps the previous rows on screen at 60% with aria-busy and a thin bar at the top until the new rows arrive. The skeleton is only for the first load. ProgressBar is a native progress element for a goal of the month."
        title="Refresh and progress"
      >
        <RefreshShowcase />
      </Section>

      <Section
        description="Hand-written SVG (no library): tooltip on focus or hover, an equivalent table, colours validated for colour blindness in both themes."
        title="Charts"
      >
        <div className="grid gap-stack xl:grid-cols-2">
          <TitledCard
            description="Hero chart: the only place with violet → pink"
            icon={TrendingUp}
            title="Monthly revenue"
          >
            <ChartFrame
              label="Monthly revenue"
              table={
                <DataTable
                  caption="Revenue by month"
                  columns={REVENUE_COLUMNS}
                  rowKey={(row) => row.key}
                  rows={HERO_REVENUE}
                />
              }
            >
              <GradientBarChart
                ariaLabel="Revenue by month, from May to November 2026"
                data={HERO_REVENUE}
                formatAxis={formatAxisCurrency}
                formatValue={money}
                series={[{ ...HERO_SERIES, key: "revenue", label: "Revenue" }]}
              />
            </ChartFrame>
          </TitledCard>
          <TitledCard icon={Users} title="Active workspaces">
            <BandLineChart
              ariaLabel="Active workspaces, actual and projected, with an uncertainty band"
              color="var(--chart-1)"
              formatValue={formatCount}
              points={ACTIVE_WORKSPACES}
            />
          </TitledCard>
        </div>
        <TitledCard icon={ChartColumn} title="Revenue × costs">
          <PeriodBarChart
            ariaLabel="Revenue and costs by month, from May 2026 to April 2027"
            controls={
              <Select defaultValue="monthly" items={{ monthly: "Monthly", quarterly: "Quarterly" }}>
                <SelectTrigger aria-label="Grouping" className="h-8 bg-card shadow-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                </SelectContent>
              </Select>
            }
            data={REVENUE_VS_COSTS}
            formatAxis={formatAxisCurrency}
            formatValue={money}
            layout="grouped"
            series={[
              { color: "var(--revenue)", key: "revenue", label: "Revenue" },
              { color: "var(--expense)", key: "costs", label: "Costs" },
            ]}
            summary={(values) => ({
              label: "Result",
              value: (values.revenue ?? 0) - (values.costs ?? 0),
            })}
          />
        </TitledCard>
        <div className="grid gap-stack lg:grid-cols-2">
          <TitledCard icon={Cloud} title="Sign-ups by plan">
            <DonutChart
              ariaLabel="October sign-ups by plan"
              centerLabel="October"
              centerValue={formatCount(2_140)}
              formatValue={formatCount}
              segments={[
                { color: CHART_SERIES[0], key: "free", label: "Free", value: 1_240 },
                { color: CHART_SERIES[1], key: "team", label: "Team", value: 520 },
                { color: CHART_SERIES[2], key: "business", label: "Business", value: 310 },
                { color: CHART_SERIES[4], key: "other", label: "Other", value: 70 },
              ]}
            />
          </TitledCard>
          <TitledCard icon={TrendingDown} title="Largest costs">
            <DonutChart
              ariaLabel="Largest costs of October by category"
              centerLabel="costs"
              centerValue={money(47_800)}
              formatValue={money}
              legend="left"
              segments={[
                { color: HERO_RAMP[0], key: "payroll", label: "Payroll", value: 28_000 },
                {
                  color: HERO_RAMP[1],
                  key: "infrastructure",
                  label: "Infrastructure",
                  value: 10_000,
                },
                { color: HERO_RAMP[2], key: "support", label: "Support", value: 7_000 },
                { color: HERO_RAMP[3], key: "other", label: "Other", value: 2_800 },
              ]}
            />
          </TitledCard>
        </div>
        <TitledCard icon={UserPlus} title="Where October sign-ups came from">
          <WaterfallChart
            ariaLabel="October sign-ups by source: organic, referral and paid, minus the ones that churned in the first month"
            formatValue={(value, options) => formatNumber(value, options)}
            rows={SIGNUP_SOURCES}
            total={{ color: "var(--foreground)", label: "Net", title: "Net sign-ups" }}
          />
        </TitledCard>
      </Section>

      <Section
        description="A mini dashboard built only with the design system components, with fictional data."
        title="Example: dashboard"
      >
        <MiniDashboard />
      </Section>

      <Section
        description="A timeline with tabs and counters, a period select with a divider, AI events with a violet icon and stroke, and a completed task with a neutral check."
        title="Example: inbox"
      >
        <MiniFeed />
      </Section>

      <Section
        description="Confirms something that just happened, with Undo when possible. A white card at the top (on phones, right below the fixed header), colour only on the icon; hover pauses, drag or Esc closes. A decision that needs attention goes in an AlertCard."
        title="Toast"
      >
        <ToastShowcase />
      </Section>

      <Card>
        <CardHeader
          description="Full guide in docs/design-system.md; colour and typography decision in docs/adr/0018-design-system.md."
          icon={FileText}
          title="Documentation"
        />
      </Card>
    </div>
  );
}
