"use client";

import { ChevronRight } from "lucide-react";
import { type ReactNode, useId, useState } from "react";

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type DataColumn<Row> = {
  key: string;
  header: ReactNode;
  cell: (row: Row) => ReactNode;
  align?: "start" | "end";
  /** Hides the column below `md` (secondary details on phones). */
  hideOnMobile?: boolean;
  /**
   * Says whether the row's cell is empty. With it, the column disappears when every visible row
   * (outside collapsed groups) is empty, instead of showing a whole column of "—".
   */
  isEmpty?: (row: Row) => boolean;
  className?: string;
};

/**
 * Rows that share the same collapsible group key, in table order. `path` has the keys from the
 * outermost group down to this one (`["2025", "fees"]`) and `depth` the level (0 = outer group).
 */
export type DataRowGroup<Row> = {
  depth: number;
  key: string;
  path: ReadonlyArray<string>;
  rows: ReadonlyArray<Row>;
};

/**
 * Collapsible groups: secondary rows become one summary row with a chevron, collapsed by default.
 * The summary takes the place of the group's first row; open, each row returns to its position
 * without changing the table order. Groups can nest (a year with that year's informational rows):
 * `groupOf` returns the keys from the outside in.
 */
export type DataRowGroups<Row> = {
  /**
   * Group key of the row, or the keys from the outside in (`["2025", "fees"]`) for nested groups;
   * `null` (or an empty list) keeps the row always visible.
   */
  groupOf: (row: Row) => string | ReadonlyArray<string> | null;
  /** Group that starts open (the current year); the others start collapsed. */
  defaultOpen?: (group: DataRowGroup<Row>) => boolean;
  /** Text of the summary row ("2023 · 22 fees · $4,635.00"). */
  summary: (group: DataRowGroup<Row>) => ReactNode;
  /** Name of the button, with what it opens or collapses ("Show 22 fees from 2023"). */
  toggleLabel: (group: DataRowGroup<Row>, open: boolean) => string;
  /**
   * Action for the whole group, right of the summary and outside the toggle button ("Mark as
   * received" on a client's overdue rows). On phones it drops below the summary when it does not fit.
   */
  action?: (group: DataRowGroup<Row>) => ReactNode;
  /**
   * Content of the summary row in the table columns, by column `key` (the total in the Amount
   * column, the oldest due date in the Due column, the group action in the actions column): it lines
   * up with the group's rows. The summary and `action` sit in the first cell, which spans the
   * columns up to the first one with content. Cells inherit alignment, classes and `hideOnMobile`
   * from the column: on phones, what must stay visible goes in the summary or in `action`.
   */
  cells?: (group: DataRowGroup<Row>) => Partial<Record<string, ReactNode>>;
  /**
   * Extra classes for the first cell of the summary row. With `headerOnMobile={false}` it touches
   * the card padding on phones (`max-md:px-0`); in a card without padding (`p-0`), the inset comes
   * from here (`max-md:px-4`), the same as the row cells.
   */
  className?: string;
};

type Item<Row> = { kind: "row"; row: Row } | { kind: "group"; group: DataRowGroup<Row> };

/** Group keys of the row, from the outside in. */
function groupPath<Row>(groups: DataRowGroups<Row> | undefined, row: Row): ReadonlyArray<string> {
  const key = groups?.groupOf(row) ?? null;
  if (key === null) return [];

  return typeof key === "string" ? [key] : key;
}

/** Identity of a group: the keys from the outside down to it ("fees" of 2024 is not that of 2025). */
const pathId = (path: ReadonlyArray<string>) => JSON.stringify(path);

function GroupToggle<Row>({
  className,
  columns,
  group,
  groups,
  onToggle,
  open,
}: {
  className: string | undefined;
  columns: ReadonlyArray<DataColumn<Row>>;
  group: DataRowGroup<Row>;
  groups: DataRowGroups<Row>;
  onToggle: () => void;
  open: boolean;
}) {
  const summaryId = useId();
  const action = groups.action?.(group);
  const cells = groups.cells?.(group) ?? {};
  const firstCell = columns.findIndex((column) => cells[column.key] !== undefined);
  // Without per-column cells, the summary spans the whole row.
  const leadSpan = firstCell <= 0 ? columns.length : firstCell;
  const rest = firstCell <= 0 ? [] : columns.slice(firstCell);
  const lead = columns[0];
  const toggle = (
    <button
      aria-describedby={summaryId}
      aria-expanded={open}
      aria-label={groups.toggleLabel(group, open)}
      className={cn(
        "group/toggle inline-flex items-center gap-1.5 rounded-md text-left text-table font-medium text-muted-foreground tabular-nums outline-none select-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
        // Inner group (fees of an open year) indented under the outer group's chevron.
        group.depth > 0 && "ml-5",
      )}
      onClick={onToggle}
      type="button"
    >
      <ChevronRight
        aria-hidden="true"
        className="size-3.5 shrink-0 transition-transform duration-150 group-aria-expanded/toggle:rotate-90 motion-reduce:transition-none"
      />
      <span id={summaryId}>{groups.summary(group)}</span>
    </button>
  );

  return (
    // `group/row`: the group action (`RowPrimaryAction`) gains its outline on hover, like the rows'.
    <TableRow
      className="group/row hover:bg-muted/50 has-aria-expanded:bg-transparent"
      data-depth={group.depth}
      data-slot="group-row"
    >
      <TableCell
        className={cn(
          // In a single column (with per-column cells), the first cell follows that column's width.
          rest.length > 0 && leadSpan === 1 && lead?.className,
          rest.length > 0 && "whitespace-normal",
          className,
          groups.className,
        )}
        colSpan={leadSpan}
      >
        {action === undefined || action === null ? (
          toggle
        ) : (
          <span className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1">
            {toggle}
            <span className="ml-auto inline-flex shrink-0 items-center">{action}</span>
          </span>
        )}
      </TableCell>
      {rest.map((column) => (
        <TableCell
          className={cn(
            column.align === "end" && "text-right tabular-nums",
            column.hideOnMobile === true && "hidden md:table-cell",
            column.className,
          )}
          key={column.key}
        >
          {cells[column.key]}
        </TableCell>
      ))}
    </TableRow>
  );
}

/**
 * Clean table: light gray header with rounded corners, tall rows separated by thin lines, numbers
 * right-aligned and tabular. Fits inside a Card (scrolls horizontally when space runs out).
 * With `groups`, secondary rows fold behind a summary row with a chevron (`DataRowGroups`).
 * With `stickyHeader`, the header stays pinned to the top of the page while long lists scroll.
 */
export function DataTable<Row>({
  caption,
  className,
  columns,
  empty,
  groups,
  headerOnMobile = true,
  rowId,
  rowKey,
  rows,
  stickyHeader = false,
  stickyOffset,
}: {
  /** Name of the table for screen readers (visually hidden). */
  caption: string;
  className?: string;
  columns: ReadonlyArray<DataColumn<Row>>;
  empty?: ReactNode;
  groups?: DataRowGroups<Row> | undefined;
  /**
   * `false` removes the header from view below `md` (it stays for screen readers): on phones the
   * row becomes a stacked item in a single column and "Client / Amount" says nothing. Group summary
   * rows touch the card padding, like the items (which zero the cell `px`).
   */
  headerOnMobile?: boolean;
  /** Row anchor (`id` of the `tr`), so a link can lead to it; `undefined` for no anchor. */
  rowId?: ((row: Row) => string | undefined) | undefined;
  rowKey: (row: Row) => string;
  rows: ReadonlyArray<Row>;
  /**
   * Header pinned to the top of the page while scrolling (long lists), below the app's sticky
   * header on phones (`--app-sticky-top`). The table stops scrolling horizontally (the overflow is
   * clipped): use only on tables that fit the width, such as the ones that stack on phones.
   */
  stickyHeader?: boolean;
  /**
   * Extra distance from the top, so the header sits below another sticky band of the page (a
   * selection bar). CSS length, such as `"3.5rem"`.
   */
  stickyOffset?: string | undefined;
}) {
  // Only what the person opened or collapsed; the rest follows `defaultOpen` (collapsed without it).
  const [toggled, setToggled] = useState<ReadonlyMap<string, boolean>>(() => new Map());

  const members = new Map<string, DataRowGroup<Row> & { rows: Row[] }>();
  for (const row of groups === undefined ? [] : rows) {
    const path = groupPath(groups, row);
    for (let depth = 0; depth < path.length; depth += 1) {
      const prefix = path.slice(0, depth + 1);
      const id = pathId(prefix);
      const group = members.get(id);
      if (group === undefined) {
        members.set(id, { depth, key: prefix[depth] ?? "", path: prefix, rows: [row] });
      } else {
        group.rows.push(row);
      }
    }
  }

  const isOpen = (group: DataRowGroup<Row>) =>
    toggled.get(pathId(group.path)) ?? groups?.defaultOpen?.(group) ?? false;

  const items: Item<Row>[] = [];
  const placed = new Set<string>();
  for (const row of rows) {
    const path = groupPath(groups, row);
    let visible = true;
    for (let depth = 0; depth < path.length; depth += 1) {
      const id = pathId(path.slice(0, depth + 1));
      const group = members.get(id);
      if (group === undefined) continue;
      if (!placed.has(id)) {
        placed.add(id);
        items.push({ group, kind: "group" });
      }
      if (!isOpen(group)) {
        visible = false;
        break;
      }
    }
    if (visible) items.push({ kind: "row", row });
  }

  const visibleRows = items.flatMap((item) => (item.kind === "row" ? [item.row] : []));
  const shown = columns.filter(
    (column) =>
      column.isEmpty === undefined || visibleRows.some((row) => column.isEmpty?.(row) === false),
  );

  // With desktop-only columns at the edges, the first and last visible on phones inherit the
  // header's rounded corners (`first:`/`last:` would land on the hidden column).
  const mobileShown = shown.filter((column) => column.hideOnMobile !== true);
  const mobileFirst = mobileShown[0];
  const mobileLast = mobileShown.at(-1);

  function toggle(group: DataRowGroup<Row>) {
    const open = isOpen(group);
    setToggled((current) => new Map(current).set(pathId(group.path), !open));
  }

  return (
    <Table
      className={cn("text-table", className)}
      // `overflow-x: auto` would make the table box the scroll container and the sticky header
      // would stick to it, which does not scroll vertically; `clip` cuts without a scroll container.
      containerClassName={stickyHeader ? "overflow-x-clip" : undefined}
    >
      <TableCaption className="sr-only">{caption}</TableCaption>
      <TableHeader
        className={cn(
          // Card background behind the header: rows passing underneath do not leak through the corners.
          stickyHeader && "sticky z-[1] bg-card",
          !headerOnMobile && "max-md:sr-only",
        )}
        style={
          stickyHeader
            ? { top: `calc(var(--app-sticky-top, 0px) + ${stickyOffset ?? "0px"})` }
            : undefined
        }
      >
        <TableRow>
          {shown.map((column) => (
            // `group/th`: a filter funnel in the header shows on hover and focus of the column.
            <TableHead
              className={cn(
                "group/th",
                column.align === "end" && "text-right",
                column.hideOnMobile === true && "hidden md:table-cell",
                column === mobileFirst && column !== shown[0] && "max-md:rounded-l-lg",
                column === mobileLast && column !== shown.at(-1) && "max-md:rounded-r-lg",
                column.className,
              )}
              key={column.key}
              scope="col"
            >
              {column.header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 && empty !== undefined ? (
          <TableRow className="hover:bg-transparent">
            <TableCell className="py-8 text-center text-muted-foreground" colSpan={shown.length}>
              {empty}
            </TableCell>
          </TableRow>
        ) : (
          items.map((item) =>
            item.kind === "group" && groups !== undefined ? (
              <GroupToggle
                // On phones the summary wraps: without wrapping ("2022 · 1 fee · $2,730.00") it
                // widened the table beyond the card and the scroll hid the items' right edge.
                className={headerOnMobile ? undefined : "max-md:px-0 max-md:whitespace-normal"}
                columns={shown}
                group={item.group}
                groups={groups}
                key={`group:${pathId(item.group.path)}`}
                onToggle={() => toggle(item.group)}
                open={isOpen(item.group)}
              />
            ) : item.kind === "row" ? (
              // `group/row`: the primary action (`RowPrimaryAction`) gains its outline on hover and focus.
              <TableRow className="group/row" id={rowId?.(item.row)} key={rowKey(item.row)}>
                {shown.map((column) => (
                  <TableCell
                    className={cn(
                      column.align === "end" && "text-right tabular-nums",
                      column.hideOnMobile === true && "hidden md:table-cell",
                      column.className,
                    )}
                    key={column.key}
                  >
                    {column.cell(item.row)}
                  </TableCell>
                ))}
              </TableRow>
            ) : null,
          )
        )}
      </TableBody>
    </Table>
  );
}
