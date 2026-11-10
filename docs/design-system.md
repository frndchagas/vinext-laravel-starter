# Design system

The design system is a set of tokens (CSS variables in `apps/web/app/globals.css`) and components in `apps/web/components/ds/`. The showcase at `/design-system` (sidebar: Developer → Design system, authenticated) renders everything with fictional data, in the light and dark themes, on the compact scale (the only one). The decision is in [ADR 0018](adr/0018-design-system.md).

## Principles

1. **Neutral first.** Text, borders, buttons and surfaces are greys and near-black. Colour appears when it carries meaning.
2. **No tinted backgrounds.** Surfaces are always white (cards, alerts, rows, suggestions) on the `#FAFAFA` canvas; in the dark theme, the theme's dark grey. Pills and badges share one light grey (`--pill`). Colour shows up only as a **status dot, icon, number, text or thin border**. No blocks tinted green, red, amber or violet.
3. **Every colour has a fixed role.** AI (violet), states (red, amber; the positive state is a neutral check, because green belongs to positive numbers) and the hero chart (violet → pink) never swap roles.
4. **Compact and balanced.** One compact scale (13 px body) with enough breathing room; controls at least 32 px tall on desktop.
5. **Legible numbers.** Tabular figures always; large values with negative tracking.
6. **Colour never alone.** Every state has text; charts have a legend, a tooltip and an equivalent table.
7. **Accessible by default.** Keyboard everywhere, visible focus (violet ring), correct roles, AA contrast.

## Voice and text

Writing rules for **every text the system generates** (alerts, questions, summaries, notifications, buttons, empty states).

- **Title = fact + date.** "API credits run out on Dec 5", not "Watch your credits".
- **Numbers instead of adjectives.** "Credits drop to 8,000, below the 20,000 reserve", not "credits may run low".
- **Action verb on the button.** "Top up 15,000 credits", "Merge the accounts", "Send reminder". Never "Review", "OK" or "Accept suggestion".
- **Short sentences.** One idea per sentence; the detail goes under "Show calculation".
- **Avoid** "AI suggestion", "Needs approval", "insights" as a selling adjective, "optimize", "smart" and the like.
- **Plain English, as a colleague would write.** Direct, no ceremony, no marketing tone.
- **Exact values.** Money always carries cents (`$5,750.00`) in screens, cards, lists, tooltips, tables and KPIs: `formatCurrency` in `components/ds/format.ts`. The **only exception** is the tick labels of a chart axis ("0, $25K, $50K"), which use `formatAxisCurrency` or `formatAxisNumber`.

| Write                                                      | Avoid                              |
| ---------------------------------------------------------- | ---------------------------------- |
| API credits run out on Dec 5                               | AI suggestion: optimize your usage |
| Credits drop to 8,000 on Dec 5, below the 20,000 reserve   | Credits may run low soon           |
| Top up 15,000 credits                                      | Review · Needs approval            |
| 3 invites expired on Nov 2, 2 of them for the Billing role | Smart insights about your team     |

The AI origin never becomes a label: it shows as a small violet icon or a thin violet stroke, and the detailed "why" says where the calculation came from ("Calculated by the AI from today's balance and the scheduled jobs").

## Tokens

### Colour: roles

| Role       | Token                          | Light                 | Dark                  | Use                                      |
| ---------- | ------------------------------ | --------------------- | --------------------- | ---------------------------------------- |
| Canvas     | `--background`                 | `#FAFAFA`             | `#0F0F11`             | Page background                          |
| Card       | `--card`                       | `#FFFFFF`             | `#18181B`             | Cards, alerts, popovers, sidebar         |
| Ink        | `--foreground`                 | `#18181B`             | `#FAFAFA`             | Main text, primary button                |
| Muted text | `--muted-foreground`           | `#6B6B73`             | `#A1A1AA`             | Labels, subtitles, axes                  |
| Muted      | `--muted`                      | `#F4F4F5`             | `#232327`             | Table header, active item, tracks        |
| Pill       | `--pill`                       | `#F4F4F5`             | `#26262B`             | The one background of pills and counters |
| Border     | `--border` / `--border-strong` | `#EBEBEE` / `#DEDEE2` | `#27272A` / `#34343A` | Cards / controls                         |
| Focus      | `--ring`                       | `#8B5CF6`             | `#A78BFA`             | Focus ring                               |

Generated Tailwind utilities: `bg-card`, `bg-pill`, `text-muted-foreground`, `border-border-strong`, `text-ai-ink`, `bg-ai-mark`, `bg-hero-gradient`, `text-positive`, `bg-attention-mark`, `h-control`, `h-row`, `p-card`, `gap-stack` and so on.

There are no tinted-background tokens (`--*-soft`) and no `text-ai-gradient`/`border-ai-gradient` utilities. Links and text actions are neutral ink (`--pen`).

### Colour: AI

- `--ai-ink` (`#6D28D9`; dark `#C4B5FD`): the **small violet icon** (`Sparkles`) and the number of AI counters.
- `--ai-mark` (`#8B5CF6`; dark `#A78BFA`): the **thin 2 px violet stroke** on the left border of alerts and events that came from the AI, the "Waiting" dot and the bell's dot.
- Never: violet background, gradient button, gradient badge, gradient text.

### Colour: hero chart (violet → pink)

`--ai-from #8B5CF6` → `--ai-to #EC4899` (dark `#D946A8`), in `--hero-gradient`. **Only on the bars of the hero chart** of each page (one per page). Nowhere else.

Hero chart categories: `--hero-cat-1..3` (dark violet, pink, lilac) + `--hero-other` (grey, always labelled "Other"). Validated for colour blindness in every pair, in both themes. More than 3 coloured categories: group the rest into "Other". `HERO_RAMP` in `charts/donut-chart.tsx` exposes them in order.

### Colour: semantic

| State             | Text and number       | Dot / bar                              |
| ----------------- | --------------------- | -------------------------------------- |
| Positive (number) | `--positive #15803D`  | `--positive`, `--status-good`          |
| Positive (state)  | `--foreground`        | circled check in `--muted-foreground`  |
| Negative / late   | `--negative #C81E1E`  | `--negative`, `--status-critical`      |
| Attention         | `--attention #8A5A00` | `--attention-mark #B58300`             |
| Neutral           | `--muted-foreground`  | `--subtle-foreground`, `--chart-muted` |

No background: the state lives in the text, the number, the dot, the progress bar or a thin border.

**Green only for positive numbers** (inflows, favourable changes). A positive _state_ ("On time", "Paid", "Active", "Done", "Connected") does not take green: `StatusDot` and `StatusPill` with `tone="positive"` draw a circled check (Lucide `CircleCheck`, 12 px, stroke 2) in `--muted-foreground` instead of a dot, with the text in ink. Late and attention stay red and amber.

**Up × down series** (charts): `--revenue #22A55A` and `--expense #B42318` (dark `#2BAF62` / `#C7302B`), validated together for colour blindness. Ramps of one hue to break a series into categories: `--revenue-1..4`, `--expense-1..4` and the 7-step `--expense-slice-1..7` (1 = largest).

### Colour: categorical series and the accent set

- `--chart-1..5` (`CHART_SERIES` in `charts/donut-chart.tsx`): parts of a whole with up to 5 parts; the last one is the grey "Other".
- `--accent-1..5` (orange, blue, pink, mustard, teal; lighter in the dark theme): stable identities for user-created things (tags, saved views, workspaces), chosen by id and outside the AI and semantic hues (no green, violet or red). Identity, not state: only on the dot beside a name in ink.

### Contrast (WCAG)

| Text token           | Light: card / pill | Dark: card / pill |
| -------------------- | ------------------ | ----------------- |
| `--foreground`       | 17.7 / 16.1        | 17.0 / 14.4       |
| `--muted-foreground` | 5.3 / 4.8          | 6.9 / 5.9         |
| `--ai-ink`           | 7.1 / 6.5          | 9.6 / 8.2         |
| `--positive`         | 5.0 / 4.6          | 10.2 / 8.6        |
| `--negative`         | 5.7 / 5.2          | 6.4 / 5.4         |
| `--attention`        | 5.9 / 5.4          | 11.3 / 9.6        |

All pass AA for normal text (4.5:1), including on the pill grey. Non-text marks: `--ai-mark` 4.2:1 on the card; the amber dot (`--attention-mark`) sits at 3.4:1 on the card and 3.1:1 on the pill and always comes with text. Data colours under 3:1 (the hero lilac) always appear with a legend, a tooltip and a table.

### Shape, shadow and space

- Radii: `--radius 10px` (controls), `--radius-card 16px` (cards, `rounded-card`), pills `rounded-full`.
- Shadows: `shadow-card` (almost invisible), `shadow-raised` (active segment), `shadow-popover` (menus, tooltips).
- Space (compact scale, the only one):

| Token              | Utility                                                     | Value |
| ------------------ | ----------------------------------------------------------- | ----- |
| `--space-page`     | `px-page`, `p-page`                                         | 24px  |
| `--space-card`     | `p-card`                                                    | 20px  |
| `--space-stack`    | `gap-stack`                                                 | 16px  |
| `--row-height`     | `h-row` (table row)                                         | 40px  |
| `--control-height` | `h-control`, `size-control` (button, field, select, search) | 32px  |

Button `sm` is also 32 px. The segmented control draws each option at 28 px but its touch target reaches 32 px (pseudo-element).

### Typography

**Figtree is the single font** (SIL OFL, self-hosted through `next/font/google` in `app/layout.tsx`, weights 300–900). Numbers with `tabular-nums` always; `figure` on large values. No uppercase labels.

Scale (size/line-height in px):

| Class                  | Size/line | Weight  | Use                                         |
| ---------------------- | --------- | ------- | ------------------------------------------- |
| `text-hero`            | 30/36     | 600     | The one big number of a page                |
| `text-kpi`             | 24/28     | 600     | KPI value                                   |
| `text-display`         | 18/24     | 600     | Greeting                                    |
| `text-title`           | 18/24     | 600     | Page and section title                      |
| `text-heading`         | 16/22     | 600     | Card and alert title                        |
| `text-body`, `text-sm` | 13/20     | 400     | Text                                        |
| `text-table`           | 12/16     | 400     | Tables (`DataTable`, `components/ui/table`) |
| `text-label`           | 12/16     | 400–500 | Labels, context lines                       |
| `text-caption`         | 11/14     | 400–500 | Pills, axes, legends                        |

`--text-*`, `--space-*`, `--row-height` and `--control-height` live in `@theme` and `:root` of `globals.css`, with no attribute on `<html>` and no saved preference.

`cn()` (`lib/utils.ts`) registers the scale in tailwind-merge; without it, `cn("text-caption", "text-negative")` would drop the size. It also registers the named spacings (`page`, `card`, `stack`, `row`, `control`), the `card`/`pill` radii and the `card`/`raised`/`popover` shadows, so `<Card className="p-0">` removes `p-card` and `className="gap-3"` replaces `gap-stack`.

### Appearance

`lib/appearance.ts` keeps the theme (`light`, `dark`, `system`) in `localStorage` and a cookie, so the server renders the right `.dark` class and the page does not flash. `AppearanceSelector` is a `SegmentedControl` (a radiogroup). The light theme is the default; the dark theme keeps the same roles with its own values.

## Components (`apps/web/components/ds/`)

| Component                                                                                                                                                                                                        | File                              | When to use                                                                                                                                                                                                                                                                                            |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `PageHeader`                                                                                                                                                                                                     | `page-header.tsx`                 | Top of the page: icon + title, optional search ("Search… ⌘K"), bell with a violet unread dot and actions. The title line is never shorter than a control (32 px), so the divider sits in the same place on every page                                                                                  |
| `Greeting`, `Highlight`, `salutationFor`                                                                                                                                                                         | `greeting.tsx`                    | "Good morning, Alex!" + a summary sentence with highlighted numbers (the hour comes from the browser after hydration; pass `hour` in tests)                                                                                                                                                            |
| `Card`, `CardHeader`, `TitledCard`, `IconTile`                                                                                                                                                                   | `card.tsx`                        | Every block of content. `TitledCard` wires the title to the region (`wrap` for long titles). `IconTile tone="ai"` colours only the icon                                                                                                                                                                |
| `AlertCard`, `ALERT_MEASURE`, `ALERT_FRAME_MEASURE`                                                                                                                                                              | `alert-card.tsx`                  | Alert or proposal that asks for a decision: fact and date, reason with numbers, sparkline, verbs on the buttons, "Show calculation" (`details`). `origin="ai"` draws only the violet stroke; `variant="plain"` inside a `FeedItem`; `confidence` adds a meter                                          |
| `KpiStrip`, `deltaTrend`, `mobileGridCells`                                                                                                                                                                      | `kpi-strip.tsx`                   | Sibling numbers in one card with dividers and a change coloured by polarity (`down-is-good` for costs). One per row on phones (`mobileGrid` for two columns); `wrap` lets items flow from `lg`; `cta` adds one verb per item                                                                           |
| `KpiCard`, `deltaContext`, `rangeContext`                                                                                                                                                                        | `kpi-card.tsx`                    | An isolated number with context in a grey pill (change, likely range, an alert with a date) or `note`, a sparkline (`sparkline` + `accent`: `positive`, `negative`, `ai`), `children` at the end and `cta` (one verb that is the only link and stretches over the card)                                |
| `ProgressBar`                                                                                                                                                                                                    | `progress-bar.tsx`                | Thin progress of a goal (invited × planned), native `<progress>` with `aria-valuetext`; grey track, ink fill, colour only in the number                                                                                                                                                                |
| `StatusPill`, `CountPill`, `pillClass`                                                                                                                                                                           | `pill.tsx`                        | Short state in a grey pill with a coloured dot (or icon) and neutral text; `tone="positive"` takes the neutral check; `dot` puts a grey dot on the neutral tone; counters for tabs and navigation                                                                                                      |
| `StatusDot`                                                                                                                                                                                                      | `status-dot.tsx`                  | Discreet state in lists ("● Late"), without a pill; `tone="positive"` takes the neutral check                                                                                                                                                                                                          |
| `AiBadge`, `ConfidenceMeter`, `confidenceBand`                                                                                                                                                                   | `ai-mark.tsx`                     | AI authorship in a table ("Created by AI": grey pill with a violet icon); confidence as a thin bar with a percentage                                                                                                                                                                                   |
| `Tabs`, `TabPanel`                                                                                                                                                                                               | `tabs.tsx`                        | Tabs with counters (grey pill) and a black underline (Base UI); when they overflow they scroll with snapping, keep the active tab in view and show 32 px chevrons over a 24 px fade                                                                                                                    |
| `SegmentedControl`                                                                                                                                                                                               | `segmented-control.tsx`           | Single choice among 2–6 options (radiogroup, arrow keys); optional decorative `icon`; `short` label on phones; 36 px tall on phones, 28 px from `sm`                                                                                                                                                   |
| `MonthSelect`, `monthOptions`                                                                                                                                                                                    | `month-select.tsx`                | Month ("Feb 2026") instead of `<input type="month">`: Base UI Select between `min` and `max`, value `YYYY-MM`                                                                                                                                                                                          |
| `DateField`                                                                                                                                                                                                      | `date-field.tsx`                  | Date instead of `<input type="date">`: typed field `mm/dd/yyyy` (32 px, masked) and a calendar popover (Base UI) from the icon; APG keyboard (arrows, PageUp/PageDown, Home/End, Enter, Esc); `min`/`max` and the submitted `name` in `YYYY-MM-DD`                                                     |
| `Disclosure`                                                                                                                                                                                                     | `disclosure.tsx`                  | Collapsed block with a Lucide chevron (the "Show calculation" drawing), never the browser's ▶                                                                                                                                                                                                          |
| `Feed`, `FeedItem`, `FeedChip`, `FeedTask`, `FeedPeriod`                                                                                                                                                         | `feed.tsx`                        | Timeline: "actor + verb + chip · time", content nested in a white card; `variant="ai"` colours the icon and adds the violet stroke; `variant="done"` and `FeedTask done` show the neutral check                                                                                                        |
| `DataTable`, `DataColumn`, `DataRowGroups`                                                                                                                                                                       | `data-table.tsx`                  | Clean 12 px tables. `groups` collapses secondary rows into a summary row (`groupOf` with nested keys, `defaultOpen`, `action`, `cells`); `isEmpty` hides a column when every visible row is empty; `hideOnMobile`, `headerOnMobile={false}`; `stickyHeader` with `--app-sticky-top` and `stickyOffset` |
| `Initials`, `initialsOf`                                                                                                                                                                                         | `avatar.tsx`                      | Initials in a neutral circle for people and organisations                                                                                                                                                                                                                                              |
| `RowActions`, `RowAction`, `RowPrimaryAction`                                                                                                                                                                    | `row-actions.tsx`                 | Ghost primary action (icon + verb; outline on row hover or focus via `group/row`) and secondary actions in a 32 px "…" menu (Base UI). Destructive in red text. Nothing shows only on hover                                                                                                            |
| `EmptyState`, `Skeleton`                                                                                                                                                                                         | `empty-state.tsx`, `skeleton.tsx` | Empty with an action; first load                                                                                                                                                                                                                                                                       |
| `RefreshRegion`, `RefreshBar`                                                                                                                                                                                    | `refresh-region.tsx`              | Data that changes with a filter, tab or period: the previous data stays at 60% with `aria-busy` and a thin bar at the top until the new data arrives (see [Loading](#loading))                                                                                                                         |
| `RouteSkeleton`, `SkeletonCard`, `SkeletonKpis`, `SkeletonRows`                                                                                                                                                  | `route-skeleton.tsx`              | Whole-route skeleton in `loading.tsx`: shows on the click, before the route (see [Loading and pending](#loading-and-pending))                                                                                                                                                                          |
| `HoldNavigationProgress`, `useHoldNavigationProgress`                                                                                                                                                            | `hold-navigation-progress.tsx`    | Keeps the top progress bar lit while a route skeleton is on screen                                                                                                                                                                                                                                     |
| `Toaster`, `toast`, `TOAST_DURATIONS`                                                                                                                                                                            | `toast.tsx`                       | Short confirmation of something that just happened, with "Undo" when possible (see [Toast](#toast))                                                                                                                                                                                                    |
| `formatCurrency`, `formatNumber`, `formatCount`, `formatPercent`, `formatPercentPrecise`, `formatAxisCurrency`, `formatAxisNumber`, `formatMonthShort`, `formatMonthLong`, `shiftMonth`, `currentMonth`, `MINUS` | `format.ts`                       | `Intl`-based formatters (`en-US`, `USD` by default). Pass `currency` for another currency; axis formatters only on chart axes                                                                                                                                                                          |
| `POPUP_CLASS`                                                                                                                                                                                                    | `popup.ts`                        | Shared classes of Base UI popups (menus, selects, calendars)                                                                                                                                                                                                                                           |
| Charts                                                                                                                                                                                                           | `charts/*`                        | See below                                                                                                                                                                                                                                                                                              |

Buttons (`components/ui/button.tsx`): primary near-black, secondary outlined, `ghost` without a border and `destructive` outlined with red text (no tinted background). No button uses a gradient. `disabled` with `focusableWhenDisabled` turns into `aria-disabled`: same look as disabled, still in the Tab order, with a tooltip saying what is missing.

Tables on phones (below `md`): when the columns do not fit in 390 px, the row becomes a stacked item in the first cell (`md:hidden`) and the other columns stay desktop-only (`hideOnMobile`), with `headerOnMobile={false}`. Line 1 with the name and the value on the right; line 2 with the secondary text and the action.

### Usage patterns

<a id="loading"></a>**Loading.** The skeleton (`Skeleton`, `SkeletonCard`) is only for the first load, when the screen has no data at all. When a filter, tab, search, page or period changes the query key, the screen does not switch back to the skeleton:

- the query uses `placeholderData: keepPreviousData` (TanStack Query) and the screen shows the skeleton only on `isPending`;
- the region that depends on the query goes in `<RefreshRegion busy={query.isPlaceholderData}>`: the structure stays, the previous data dims to 60% (after 150 ms, so fast responses do not flicker) with `aria-busy`, a 2 px bar runs at the top (after 200 ms; still with `prefers-reduced-motion`) and the swap happens at once when the new data arrives;
- `bar={false}` on small bands (titles, totals, KPIs); `announcement` reads a short sentence (`aria-live="polite"`) when the results arrive;
- loading the next page and reloading after an action dim nothing: only the key change does;
- the title that describes the data names the period of the data on screen, not the one just chosen, until the new data arrives.

```tsx
const query = useListUsers({ page, search }, { query: { placeholderData: keepPreviousData } });
if (query.isPending) return <SkeletonRows rows={8} />;
<RefreshRegion announcement="Users updated" busy={query.isPlaceholderData}>
  <DataTable … />
</RefreshRegion>
```

The e2e accessibility check waits until no `aria-busy="true"` remains before measuring.

<a id="loading-and-pending"></a>**Loading and pending (response on the click).** The click answers at once, before the server, so nobody clicks twice. Four pieces:

1. **Navigation progress bar** (`components/navigation/navigation-progress.tsx`, store in `lib/navigation-progress.ts`, mounted in `app/layout.tsx`): 2 px in the primary colour, fixed to the top of the window. Lights up the instant the router starts a navigation (`onRouterTransitionStart` in `instrumentation-client.ts`, called by Vinext on every `<Link>`, `router.push`/`replace` and back/forward), creeps to 90% and completes when the new route is in (`usePathname` changes) and no route skeleton is on screen. Does not light up when only the search or the hash changes. Decorative (`aria-hidden`); still with `prefers-reduced-motion`; a navigation that never arrives releases the bar after 15 s.
2. **Pending menu item** (`components/navigation/`): the clicked item gets the hover background and a 14 px spinner beside the label until the navigation ends (`useLinkStatus` from `next/link`). The phone drawer closes on the click and the top bar keeps showing progress.
3. **Route skeleton** (`loading.tsx` in each authenticated route, with `RouteSkeleton`, `SkeletonCard`, `SkeletonKpis` and `SkeletonRows`): the real page title (without actions) and the main blocks in grey, where the page draws its own. Vinext mounts it on the click, before the route responds. Deliberately light: a server component, markup only. When you create a page, create its `loading.tsx`.
4. **Pending button** (`Button` with `pending` and `pendingLabel`): every button that fires a mutation locks on the click until the request returns: disabled but focusable (`aria-disabled`), `aria-busy`, progress cursor, a spinner in place of the icon and the progress label ("Saving…"). A second click or Enter does not repeat the request. Validation stays in `disabled`; only the request under way goes in `pending`. When one mutation serves several rows, only the clicked row's button spins (`pending={mutation.isPending && mutation.variables.id === row.id}`). Menu items (`RowActions`) do not spin: they are disabled.

```tsx
<Button disabled={!hydrated} pending={mutation.isPending} pendingLabel="Saving…" type="submit">
  Save
</Button>
```

**KpiCard.**

```tsx
<KpiCard icon={UserPlus} label="Sign-ups, October" value={formatCount(2_140)}
  context={deltaContext({ comparison: "vs September", ratio: -0.019 })} />
<KpiCard icon={Activity} label="Months of runway" value="15.0 months" context={rangeContext("10.7", "18.6")} />
<KpiCard icon={CircleAlert} label="Lowest projected credits" value={formatCount(8_000)}
  context={{ pill: "Dec 5", text: "below the 20,000 reserve", tone: "negative" }} />
<KpiCard accent="positive" label="Sign-ups" sparkline={[62, 60, 64, 70]} value={formatCount(2_140)}
  context={deltaContext({ comparison: "vs last month", ratio: 0.105 })} />
```

The context pill is grey; the colour lives in the number. `accent` tints only the thin border and the sparkline (`positive` = `--positive`, `negative` = `--negative`, `ai` = `--ai-mark`). A change where down is good uses `polarity: "down-is-good"`.

**Alert.** `AlertCard` with the fact and the date in the title. A card that groups alerts counts the items it shows ("3 alerts on Nov 4") instead of saying "Needs attention".

```tsx
<AlertCard
  origin="ai"
  title="API credits run out on Dec 5"
  reason="The batch job (18,350) and the scheduled reports (2,100) run on the 5th. Without a top-up, the balance drops to 8,000, below the 20,000 reserve."
  chart={<ForecastSparkline ariaLabel="…" formatValue={credits} points={forecast} threshold={20_000} thresholdLabel="reserve" />}
  actions={
    <>
      <Button>Top up 15,000 credits</Button>
      <span className="flex items-center gap-2">
        <Button variant="outline">Remind me on Dec 1</Button>
        <Button className="px-2" variant="ghost">Ignore</Button>
      </span>
    </>
  }
  details={/* the numbers behind the title and where the calculation came from */}
/>
```

- One primary button (a verb), one outlined and one `ghost`. The two secondary ones share a `span flex` and wrap together: on a phone the primary sits on the first line and the other two on the second, never "Ignore" alone on a third.
- `origin="ai"` draws only the thin violet stroke on the left; no badge, label or background. `origin="system"` draws nothing.
- `details` opens under "Show calculation" (`Disclosure`: native `<details>` with a Lucide chevron). `detailsLabel` changes the label; `onDetailsToggle` tells you when it opens, to load the content only then.
- `confidence` shows the confidence when the decision is a classification. `variant="plain"` removes the frame and the stroke inside a `FeedItem variant="ai"`, which already has the stroke. `titleSize="body"` writes the title at 13 px for long question sentences.

**ForecastSparkline.** A 2 px line in neutral ink, a dashed threshold line with its label, the stretch below the threshold in `--negative` and a dot on the last point. `splitAtThreshold` cuts each crossing exactly at the intersection; the lowest point (`valleyIndex`), when it comes before the end, gets its own dot and label. Native tooltip per point; `ariaLabel` becomes the text for screen readers.

**Disclosure, MonthSelect and DateField.** Every collapsed block uses `Disclosure`, never `<details>` with the browser's ▶. Month choice uses `MonthSelect` instead of `<input type="month">`, which shows the month in the browser's language; it keeps the current value in the list even outside `min`/`max`. Dates use `DateField` instead of `<input type="date">`, whose format and icon change with the browser. Choice among fixed options in a form uses the Base UI `Select` from `components/ui/select.tsx` (32 px, same chevron), which puts the value in a hidden field with the same `name`.

**Feed.** The sentence "actor + verb + chip · time" (`FeedChip`; the time in `<time>` closes the line and wraps together with the chip), content nested in a white card. Circles always white with a border; `variant="ai"` colours the icon violet and adds the violet stroke on the content; `variant="done"` shows the neutral check. `FeedTask done`: neutral check in an outlined circle, struck-through text and "(done)" for screen readers.

### Charts (`components/ds/charts/`)

Hand-written SVG, no library: no dependency, and the theme comes through tokens. Common rules: recessive 1 px grid and axes, thin marks with rounded caps, keyboard focus and hover with a tooltip, an equivalent table through `ChartFrame` (`components/charts/chart-frame.tsx`), no dual axis. Every chart takes `formatValue` (and `formatAxis` where there is an axis), so the same component serves money, counts or credits.

| Component                         | Pattern                                                                                                                                                                                                                                                                                                        |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GradientBarChart`                | Columns with a vertical gradient. With `HERO_SERIES` it is the hero chart (violet → pink), the only use of the gradient.                                                                                                                                                                                       |
| `PeriodBarChart layout="stacked"` | Stacked bars by category; each segment is a pill separated by 3 px. Past in a soft tone, current month saturated, dashed "Today" line, future as a dashed ghost bar; legend with dots and "Forecast"; tooltip with the breakdown and the total.                                                                |
| `PeriodBarChart layout="grouped"` | Up × down (`--revenue`, `--expense`): two bars per period, same past/today/forecast treatment; `summary` shows the result in the tooltip; `controls` takes the grouping select.                                                                                                                                |
| `DonutChart`                      | Part of a whole with up to 5 parts (`CHART_SERIES` or `HERO_RAMP`). `legend="right"` (rows with % and value) or `legend="left"` ("Payroll = $28,000" before the donut). More than 5 parts or close values: sorted bars. `maxSegments`, `icon` per slice, `onSelect` and `size` for exact totals in the centre. |
| `BandLineChart`                   | 2 px line with an uncertainty band and a dashed projected stretch.                                                                                                                                                                                                                                             |
| `ForecastSparkline`               | Projected balance × threshold (see above).                                                                                                                                                                                                                                                                     |
| `WaterfallChart`                  | Horizontal waterfall: one row per step, each starting where the previous ended; the last row is the total. Labels in ink beside the bar, never in the series colour; one tab stop, arrows switch rows.                                                                                                         |

Series colours: hero → `--hero-cat-*`; up × down → `--revenue`/`--expense`; categories → `--chart-1..5` or the ramps. Never use `--status-*` as a series.

## Toast

`components/ds/toast.tsx`, on top of `react-hot-toast` 2.6.1 (pinned): the look of [solid-toast](https://www.solid-toast.com/) with the DS tokens. The app imports `Toaster` and `toast` only from here; there is a single `<Toaster />` in the root layout, which serves the authenticated and the auth pages.

**Look.** A compact card (`--card`, `--border`, `--radius`, soft shadow) centred at the top, Figtree 13 px. On desktop the stack sits 16 px from the top; below `lg`, where the app has a fixed header (brand and "Menu"), it starts at 64 px, right below it. Colour only on the icon: green circle (`--positive`) with the check, red circle (`--negative`) with the X, neutral spinner while loading, violet `Sparkles` (`--ai-ink`) on AI toasts. No coloured background. Springs in from the top, scales out, the stack reorders smoothly; with `prefers-reduced-motion` only the opacity changes.

**Behaviour.** Hover or focus inside a toast pauses all of them; Alt+T moves the focus to the first action; Esc closes the focused toast; dragging up or sideways closes. Each toast is `role="status"` (`aria-live="polite"`); errors are `role="alert"`. Toasts with an action have a "Close notification" button. A toast disappears on its own: it is never the only place for critical information.

### When to use

| Situation                                                                                                     | Use                                                             |
| ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| An action just happened and worked ("Role applied to 5 members"), preferably with **Undo**                    | `toast.success` or `toast.action`                               |
| An action fired right now failed, with the reason ("Could not read members.csv: the email column is missing") | `toast.error`                                                   |
| A short process the user started and is waiting for ("Importing 3 files…" → "131 members imported")           | `toast.promise`                                                 |
| A decision that needs attention, with numbers and a deadline ("API credits run out on Dec 5")                 | `AlertCard`, never a toast                                      |
| A field error, an empty state, a result the person needs to look up later                                     | On the page itself (message by the field, `EmptyState`, a list) |

### API

| Call                                                                      | Duration                                                                   |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `toast(msg)`                                                              | 4 s                                                                        |
| `toast.success(msg)`                                                      | 3 s                                                                        |
| `toast.error(msg)`                                                        | 5 s                                                                        |
| `toast.loading(msg)`                                                      | until `toast.dismiss(id)` or a new toast with the same `id`                |
| `toast.promise(promise, { loading, success, error })`                     | loading until it settles; then the success or error duration               |
| `toast.action(msg, { label, onAction, description?, icon?, secondary? })` | 6 s (`secondary: { label, onAction }` adds a second verb beside the first) |
| `toast.ai(msg, opts?)`                                                    | 4 s                                                                        |
| `toast.dismiss(id?)`                                                      | closes one or all                                                          |

`toast.action` shows the verb button and the close button; clicking the action calls `onAction` and closes the toast. With `description` it becomes a two-line card (bold title, short text, button below). All of them accept the react-hot-toast options (`id`, `duration`…).

```tsx
toast.success("Role applied to 5 members");
toast.error("Could not read members.csv: the email column is missing");
toast.promise(importMembers(files), {
  loading: "Importing 3 files…",
  success: (total) => `${total} members imported`,
  error: "Could not import the members",
});
toast.action("5 members moved to Billing", { label: "Undo", onAction: undo });
toast.ai("The AI tagged 103 tickets · 7 went to the review queue");
```

Text follows [Voice and text](#voice-and-text): a fact with a number, a verb on the button ("Undo", "Update card"), no "Success!" or "Oops".

## Shell

`components/authenticated-shell.tsx` (pieces in `components/navigation/`):

1. **Compact top, one line:** the product mark and name from `lib/site-config.ts`, and the collapse button (`PanelLeftClose`).
2. **Sections with discreet titles** (`text-label` grey): **General** (Dashboard), **Admin** (Users, only for administrators) and **Developer** (Design system, at `/design-system`). Items are 32 px tall with a 16 px Lucide icon in grey and the label in ink; the current page is a subtle pill (`sidebar-accent`, `font-medium`, `aria-current="page"`); focus is the violet ring.
3. **Footer:** the account card (initials, name, email and ⋯) with Settings, the appearance selector and Sign out. Pages outside the menu mark the item they belong to with `useNavigationHighlight`.

**Collapsed:** a 56 px icon rail, remembered in `localStorage` (with try/catch). Icons keep a tooltip on the right (Base UI); titles stay for screen readers; the content shifts with it (`lg:pl-14`). Only the middle list scrolls, with a thin scrollbar that shows on hover or focus (`scrollbar-hover`).

On phones, the "Menu" button in the fixed header opens a sheet with the same sections, without the collapse button. The header's height is `--app-sticky-top`, which sticky bands and `DataTable stickyHeader` sit below.

When you add a page: decide whether it lives in **General** (daily use, in view), **Admin**, **Developer** or the **account** menu; check at 1280 × 800 that every section and the footer fit without scrolling; create its `loading.tsx`.

## Applying it to pages

- **Dashboard** (`/dashboard`): `PageHeader`, `Greeting` with the user's first name, `KpiStrip`/`KpiCard` with data the starter really has (realtime connection, account state) and `TitledCard` blocks. No invented numbers.
- **Settings** (`/settings`): two-column layout (`settings-section.tsx`), DS fields and buttons with `pending`, `loading.tsx` with `RouteSkeleton`.
- **Users** (`/admin/users`): `DataTable` with `Initials`, `StatusPill` for roles and status, `RowPrimaryAction` + `RowActions`, `RefreshRegion` on search and paging, `EmptyState` when empty.
- **Auth pages**: a centred card with DS fields and a primary button with `pending`.
- Every new text follows [Voice and text](#voice-and-text); every new colour enters as text, a dot, an icon or a border, never as a background, and passes the palette validator in both themes.
