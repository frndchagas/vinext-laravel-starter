import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { type DataColumn, type DataRowGroups, DataTable } from "./data-table";

type Row = { id: string; label: string; note: string | null; hidden: boolean };

const COLUMNS: ReadonlyArray<DataColumn<Row>> = [
  { cell: (row) => row.label, header: "Name", key: "label" },
  {
    cell: (row) => row.note ?? "—",
    header: "Note",
    isEmpty: (row) => row.note === null,
    key: "note",
  },
];

const ROWS: Row[] = [
  { hidden: false, id: "a", label: "First", note: null },
  { hidden: true, id: "b", label: "Hidden 1", note: "with a note" },
  { hidden: false, id: "c", label: "Second", note: null },
  { hidden: true, id: "d", label: "Hidden 2", note: null },
];

const GROUPS: DataRowGroups<Row> = {
  groupOf: (row) => (row.hidden ? "extras" : null),
  summary: ({ rows }) => `${rows.length} extras`,
  toggleLabel: ({ rows }, open) => `${open ? "Hide" : "Show"} ${rows.length} extras`,
};

/** First cell of each body row, in table order. */
const cells = () =>
  screen
    .getAllByRole("row")
    .slice(1)
    .map((row) => within(row).queryAllByRole("cell")[0]?.textContent);

afterEach(cleanup);

describe("DataTable", () => {
  it("renders every row and column without groups", () => {
    render(<DataTable caption="Table" columns={COLUMNS} rowKey={(row) => row.id} rows={ROWS} />);

    expect(screen.getAllByRole("row")).toHaveLength(5);
    expect(screen.getByRole("columnheader", { name: "Note" })).toBeInTheDocument();
  });

  it("pins the header to the top of the page with stickyHeader, below an extra offset", () => {
    const { rerender } = render(
      <DataTable caption="Table" columns={COLUMNS} rowKey={(row) => row.id} rows={ROWS} />,
    );
    const plain = screen.getByRole("table").closest("[data-slot='table-container']");
    // Without the option, the table scrolls horizontally and the header does not stick.
    expect(plain).toHaveClass("overflow-x-auto");
    expect(screen.getAllByRole("rowgroup")[0]).not.toHaveClass("sticky");

    rerender(
      <DataTable
        caption="Table"
        columns={COLUMNS}
        rowKey={(row) => row.id}
        rows={ROWS}
        stickyHeader
        stickyOffset="3rem"
      />,
    );
    const header = screen.getAllByRole("rowgroup")[0];
    expect(header).toHaveClass("sticky", "bg-card");
    // Below the app's sticky header on phones and the page's own sticky band.
    expect(header?.style.top).toBe("calc(var(--app-sticky-top, 0px) + 3rem)");
    // `overflow-x: auto` would pin the header to the table box, which does not scroll vertically.
    const container = screen.getByRole("table").closest("[data-slot='table-container']");
    expect(container).toHaveClass("overflow-x-clip");
    expect(container).not.toHaveClass("overflow-x-auto");
  });

  it("rounds the first and last header cells shown on the phone", () => {
    render(
      <DataTable
        caption="Table"
        columns={[
          { cell: () => "x", header: "Select", hideOnMobile: true, key: "select" },
          ...COLUMNS,
          { cell: () => "y", header: "Extra", hideOnMobile: true, key: "extra" },
        ]}
        rowKey={(row) => row.id}
        rows={ROWS}
      />,
    );

    expect(screen.getByRole("columnheader", { name: "Name" })).toHaveClass("max-md:rounded-l-lg");
    expect(screen.getByRole("columnheader", { name: "Note" })).toHaveClass("max-md:rounded-r-lg");
    expect(screen.getByRole("columnheader", { name: "Select" })).not.toHaveClass(
      "max-md:rounded-l-lg",
    );
  });

  it("puts the group action beside the toggle, outside of it", () => {
    const onAction = vi.fn<(key: string) => void>();
    render(
      <DataTable
        caption="Table"
        columns={COLUMNS}
        groups={{
          ...GROUPS,
          action: ({ key, rows }) => (
            <button onClick={() => onAction(key)} type="button">
              Mark {rows.length}
            </button>
          ),
        }}
        rowKey={(row) => row.id}
        rows={ROWS}
      />,
    );

    const toggle = screen.getByRole("button", { name: "Show 2 extras" });
    const action = screen.getByRole("button", { name: "Mark 2" });
    // Sibling buttons in the same cell (never a button inside another); the action does not open the group.
    expect(toggle).not.toContainElement(action);
    expect(toggle.closest("td")).toBe(action.closest("td"));
    fireEvent.click(action);
    expect(onAction).toHaveBeenCalledWith("extras");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("adds the groups' own classes to the summary cell, after the phone defaults", () => {
    render(
      <DataTable
        caption="Table"
        columns={COLUMNS}
        groups={{ ...GROUPS, className: "max-md:px-4" }}
        headerOnMobile={false}
        rowKey={(row) => row.id}
        rows={ROWS}
      />,
    );

    // In a card without padding, the sub-header takes the 16 px inset of the cells.
    const cell = screen.getByRole("button", { name: "Show 2 extras" }).closest("td");
    expect(cell).toHaveClass("max-md:px-4", "max-md:whitespace-normal");
    expect(cell).not.toHaveClass("max-md:px-0");
  });

  it("lines up the group's own cells with the columns of its rows", () => {
    const columns: ReadonlyArray<DataColumn<Row>> = [
      { cell: (row) => row.label, className: "w-full", header: "Name", key: "label" },
      { cell: () => "x", header: "Kind", key: "kind" },
      { align: "end", cell: () => "$1.00", header: "Amount", hideOnMobile: true, key: "amount" },
    ];
    render(
      <DataTable
        caption="Table"
        columns={columns}
        groups={{
          ...GROUPS,
          cells: ({ rows }) => ({ amount: `$${rows.length}.00` }),
          defaultOpen: () => true,
        }}
        rowKey={(row) => row.id}
        rows={ROWS}
      />,
    );

    const toggle = screen.getByRole("button", { name: "Hide 2 extras" });
    const groupRow = toggle.closest("tr");
    if (groupRow === null) throw new Error("Group row not found.");
    const groupCells = within(groupRow).getAllByRole("cell");
    // The summary spans Name and Kind; the total lands in the Amount column, with its alignment.
    expect(groupCells).toHaveLength(2);
    expect(groupCells[0]).toHaveAttribute("colspan", "2");
    expect(groupCells[1]).toHaveTextContent("$2.00");
    expect(groupCells[1]).toHaveClass("text-right", "hidden", "md:table-cell");
  });

  it("folds grouped rows behind a collapsed toggle placed where the first one was", () => {
    render(
      <DataTable
        caption="Table"
        columns={COLUMNS}
        groups={GROUPS}
        rowKey={(row) => row.id}
        rows={ROWS}
      />,
    );

    const toggle = screen.getByRole("button", { name: "Show 2 extras" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveAccessibleDescription("2 extras");
    expect(toggle.closest("td")).toHaveAttribute("colspan", "1");
    const body = screen.getAllByRole("row").slice(1);
    expect(body.map((row) => row.textContent)).toEqual(["First", "2 extras", "Second"]);
    // Only empty rows in view: the Note column disappears.
    expect(screen.queryByRole("columnheader", { name: "Note" })).toBeNull();

    fireEvent.click(toggle);
    expect(screen.getByRole("button", { name: "Hide 2 extras" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    const open = screen.getAllByRole("row").slice(1);
    expect(open.map((row) => within(row).queryAllByRole("cell")[0]?.textContent)).toEqual([
      "First",
      "2 extras",
      "Hidden 1",
      "Second",
      "Hidden 2",
    ]);
    expect(screen.getByRole("columnheader", { name: "Note" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hide 2 extras" }).closest("td")).toHaveAttribute(
      "colspan",
      "2",
    );
  });

  it("nests groups, opens the default one and keeps inner groups folded inside an open outer one", () => {
    const rows: Row[] = [
      { hidden: false, id: "a", label: "Current 1", note: null },
      { hidden: false, id: "b", label: "Current 2", note: null },
      { hidden: false, id: "c", label: "Old 1", note: null },
      { hidden: true, id: "d", label: "Old hidden", note: null },
    ];
    const nested: DataRowGroups<Row> = {
      defaultOpen: (group) => group.depth === 0 && group.key === "current",
      groupOf: (row) => {
        const year = row.label.startsWith("Current") ? "current" : "old";

        return row.hidden ? [year, "extras"] : year;
      },
      summary: ({ key, rows: members }) => `${key} · ${members.length}`,
      toggleLabel: ({ depth, key, rows: members }, open) =>
        `${open ? "Hide" : "Show"} ${members.length} ${depth > 0 ? "extras" : key}`,
    };
    render(
      <DataTable
        caption="Table"
        columns={COLUMNS}
        groups={nested}
        rowKey={(row) => row.id}
        rows={rows}
      />,
    );

    expect(screen.getByRole("button", { name: "Hide 2 current" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(cells()).toEqual(["current · 2", "Current 1", "Current 2", "old · 2"]);

    fireEvent.click(screen.getByRole("button", { name: "Show 2 old" }));
    const inner = screen.getByRole("button", { name: "Show 1 extras" });
    expect(inner).toHaveClass("ml-5");
    expect(inner.closest("tr")).toHaveAttribute("data-depth", "1");
    expect(cells()).toEqual([
      "current · 2",
      "Current 1",
      "Current 2",
      "old · 2",
      "Old 1",
      "extras · 1",
    ]);

    fireEvent.click(inner);
    expect(cells()).toContain("Old hidden");
    // Collapsing the outer group hides the inner one, even when open.
    fireEvent.click(screen.getByRole("button", { name: "Hide 2 old" }));
    expect(cells()).toEqual(["current · 2", "Current 1", "Current 2", "old · 2"]);
    // The group open by default collapses too.
    fireEvent.click(screen.getByRole("button", { name: "Hide 2 current" }));
    expect(cells()).toEqual(["current · 2", "old · 2"]);
  });
});
