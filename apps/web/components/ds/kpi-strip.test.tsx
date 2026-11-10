import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { KpiStrip, mobileGridCells } from "./kpi-strip";

afterEach(cleanup);

describe("KpiStrip", () => {
  it("makes an item with a verb a single link stretched over the item", () => {
    render(
      <KpiStrip
        ariaLabel="Team summary"
        items={[
          {
            cta: {
              ariaLabel: "Active users: view the 3 users",
              href: "/admin/users?status=active#users",
              label: "View users",
            },
            key: "users",
            label: "Active users",
            note: "3 users",
            value: "3",
          },
          { key: "plain", label: "No link", value: "—" },
        ]}
      />,
    );

    const strip = screen.getByRole("region", { name: "Team summary" });
    const links = within(strip).getAllByRole("link");
    expect(links).toHaveLength(1);
    const link = screen.getByRole("link", { name: "Active users: view the 3 users" });
    expect(link).toHaveAttribute("href", "/admin/users?status=active#users");
    expect(link).toHaveTextContent("View users");
    // Inside the `dd` (the `dl` only accepts `dt` and `dd`); the pseudo-element covers the item, which is `relative`.
    expect(link.closest("dd")).not.toBeNull();
    expect(link).toHaveClass("after:absolute", "after:inset-0");
    expect(link.closest("dd")?.parentElement).toHaveClass("relative");
    expect(strip).toHaveClass("overflow-hidden");
  });

  it("pairs each label with its value and reads the change as better or worse", () => {
    render(
      <KpiStrip
        ariaLabel="Month summary"
        items={[
          {
            delta: { comparison: "vs Oct 2026", detail: "$2,423", ratio: 0.2 },
            key: "revenue",
            label: "Revenue",
            value: "$58,900",
          },
          {
            delta: { comparison: "vs Oct 2026", polarity: "down-is-good", ratio: 0.15 },
            key: "cost",
            label: "Cost",
            value: "$31,200",
          },
          { key: "late", label: "Overdue", note: "2 contracts", value: "$15,000" },
        ]}
      />,
    );

    const strip = screen.getByRole("region", { name: "Month summary" });
    const terms = within(strip)
      .getAllByRole("term")
      .map((term) => term.textContent);
    expect(terms).toEqual(["Revenue", "Cost", "Overdue"]);

    const revenueDelta = screen.getByText(/\+20\.0%/);
    expect(revenueDelta).toHaveTextContent("+20.0% ($2,423), better");
    expect(revenueDelta).toHaveClass("text-positive");

    // A cost going up is worse, even with a positive change.
    const costDelta = screen.getByText(/\+15\.0%/);
    expect(costDelta).toHaveTextContent("worse");
    expect(costDelta).toHaveClass("text-negative");

    expect(screen.getByText("2 contracts")).toBeInTheDocument();
  });

  it("stacks one number per line on the phone and never breaks a value or its change", () => {
    render(
      <KpiStrip
        ariaLabel="Numbers"
        items={[
          {
            delta: { comparison: "vs October", detail: "−$11,798.63", ratio: -0.194 },
            key: "result",
            label: "November result",
            note: "Revenue $69,951.05 − cost $21,035.72",
            value: "$48,915.33",
          },
        ]}
      />,
    );

    const strip = screen.getByRole("region", { name: "Numbers" });
    expect(strip.querySelector("dl")).toHaveClass("grid-cols-1");
    expect(strip.querySelector("dl")).not.toHaveClass("grid-cols-2");
    expect(strip).not.toHaveAttribute("data-mobile");
    expect(screen.getByText("$48,915.33")).toHaveClass("whitespace-nowrap");
    // The percentage + value pair wraps as a whole to the next line, never in the middle.
    expect(screen.getByText(/−19\.4% \(−\$11,798\.63\)/)).toHaveClass("whitespace-nowrap");
    expect(screen.getByText("November result")).toHaveClass("truncate");
  });

  it("reads a zero change as stable, in neutral ink", () => {
    render(
      <KpiStrip
        ariaLabel="Summary"
        items={[
          {
            delta: { comparison: "vs Oct 2026", ratio: 0 },
            key: "balance",
            label: "Balance",
            value: "$54,300",
          },
        ]}
      />,
    );

    const delta = screen.getByText(/0\.0%/);
    expect(delta).toHaveTextContent("stable");
    expect(delta).toHaveClass("text-muted-foreground");
  });

  it("lays the items in two columns on the phone with the last one full width", () => {
    render(
      <KpiStrip
        ariaLabel="Coverage"
        items={["A", "B", "C", "D", "To do"].map((label) => ({
          key: label,
          label,
          value: "until 11/04",
        }))}
        mobileGrid
      />,
    );

    const strip = screen.getByRole("region", { name: "Coverage" });
    expect(strip.querySelector("dl")).toHaveClass("grid-cols-2", "sm:grid-cols-2", "lg:flex");
    const items = within(strip)
      .getAllByRole("term")
      .map((term) => term.parentElement);
    expect(items[0]).toHaveClass("max-sm:border-r", "max-sm:p-4");
    expect(items[0]).not.toHaveClass("max-sm:border-t");
    expect(items[1]).not.toHaveClass("max-sm:border-r");
    expect(items[2]).toHaveClass("max-sm:border-r", "max-sm:border-t");
    expect(items[4]).toHaveClass("max-sm:col-span-2", "max-sm:border-t");
    expect(items[4]).not.toHaveClass("max-sm:border-r");
  });

  it("wraps the items into more rows from lg with wrap, keeping a divider between them", () => {
    render(
      <KpiStrip
        ariaLabel="Coverage"
        items={["A", "B", "C", "D", "E", "F", "To do"].map((label) => ({
          key: label,
          label,
          value: "until 11/04",
        }))}
        mobileGrid
        wrap
      />,
    );

    const strip = screen.getByRole("region", { name: "Coverage" });
    expect(strip).toHaveClass("lg:overflow-hidden");
    expect(strip.querySelector("dl")).toHaveClass(
      "lg:flex",
      "lg:flex-wrap",
      "lg:-mt-px",
      "lg:-ml-px",
    );
    const items = within(strip)
      .getAllByRole("term")
      .map((term) => term.parentElement);
    for (const item of items) {
      expect(item).toHaveClass("lg:basis-40", "lg:border-l", "lg:border-t");
      expect(item).not.toHaveClass("lg:first:border-l-0", "lg:border-t-0");
    }
    // Phone: three pairs and "To do" full width.
    expect(items[6]).toHaveClass("max-sm:col-span-2");
  });

  it("never leaves a hole before the full-width last item", () => {
    // Three accounts and "To do": the third, alone on its row, also takes the full width.
    expect(mobileGridCells(4)).toEqual([
      { right: true, span: false, top: false },
      { right: false, span: false, top: false },
      { right: false, span: true, top: true },
      { right: false, span: true, top: true },
    ]);
    expect(mobileGridCells(1)).toEqual([{ right: false, span: true, top: false }]);
  });
});
