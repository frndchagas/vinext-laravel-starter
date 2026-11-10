import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { formatCount } from "../format";
import { DonutChart, type DonutSegment } from "./donut-chart";

afterEach(cleanup);

describe("DonutChart", () => {
  it("lists every segment with its share and value, and selects from the legend", () => {
    const onSelect = vi.fn<(segment: DonutSegment) => void>();
    render(
      <DonutChart
        ariaLabel="Sign-ups by source"
        centerLabel="sign-ups"
        centerValue="200"
        formatValue={formatCount}
        onSelect={onSelect}
        segments={[
          { color: "a", key: "web", label: "Web", value: 150 },
          { color: "b", key: "mobile", label: "Mobile", value: 50 },
        ]}
        selectHint="open the list"
      />,
    );

    const legend = screen.getByRole("list", { name: "Sign-ups by source" });
    const rows = within(legend).getAllByRole("button");
    expect(rows.map((row) => row.textContent)).toEqual([
      "Web75%150, open the list",
      "Mobile25%50, open the list",
    ]);

    fireEvent.click(rows[1] ?? legend);
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ key: "mobile" }));
  });
});
