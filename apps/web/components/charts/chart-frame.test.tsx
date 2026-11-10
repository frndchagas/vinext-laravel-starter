import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ChartFrame } from "./chart-frame";

afterEach(cleanup);

describe("ChartFrame", () => {
  it("toggles between the chart and its table and lists the legend", () => {
    render(
      <ChartFrame
        label="Sign-ups per month"
        legend={[
          { color: "red", label: "Web" },
          { color: "blue", label: "Mobile", shape: "line" },
        ]}
        table={
          <table>
            <tbody>
              <tr>
                <td>table</td>
              </tr>
            </tbody>
          </table>
        }
      >
        <svg aria-label="chart" />
      </ChartFrame>,
    );

    expect(screen.getByRole("list", { name: "Legend" })).toHaveTextContent("WebMobile");
    const toggle = screen.getByRole("button", { name: "Show table: Sign-ups per month" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByLabelText("chart")).toBeInTheDocument();

    fireEvent.click(toggle);
    expect(screen.getByRole("button", { name: "Show chart: Sign-ups per month" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.queryByLabelText("chart")).toBeNull();
  });
});
