import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { AlertCard } from "./alert-card";
import { ForecastSparkline } from "./charts/forecast-sparkline";
import { formatCurrency } from "./format";

afterEach(cleanup);

const POINTS = [
  { date: "2026-11-04", label: "11/04", value: 31_200 },
  { date: "2026-12-01", label: "12/01", value: 28_450 },
  { date: "2026-12-05", label: "12/05", value: 8_000 },
];

function renderBalanceAlert() {
  return render(
    <AlertCard
      actions={
        <>
          <button type="button">Transfer from savings</button>
          <button type="button">Remind me on the 1st</button>
          <button type="button">Ignore</button>
        </>
      }
      chart={
        <ForecastSparkline
          ariaLabel="Projected balance of the main account until 12/05"
          formatValue={formatCurrency}
          points={POINTS}
          threshold={20_000}
        />
      }
      details={<p>November payroll, 12/05: −$18,350</p>}
      origin="ai"
      reason="Payroll ($18,350) and taxes ($2,100) leave on the 5th."
      title="$12,000 short in the main account on 12/05"
    />,
  );
}

describe("AlertCard", () => {
  it("names the alert by its fact and date and offers the actions as buttons", () => {
    renderBalanceAlert();

    const alert = screen.getByRole("article", {
      name: "$12,000 short in the main account on 12/05",
    });
    expect(within(alert).getByText(/Payroll \(\$18,350\)/)).toBeInTheDocument();
    expect(
      within(alert)
        .getAllByRole("button")
        .map((button) => button.textContent),
    ).toEqual(["Transfer from savings", "Remind me on the 1st", "Ignore"]);
  });

  it("marks AI origin with the left stroke only, without AI labels", () => {
    const { container } = renderBalanceAlert();

    expect(container.querySelector("[data-origin-mark]")).not.toBeNull();
    expect(screen.queryByText(/AI suggestion/i)).toBeNull();
    expect(screen.queryByText(/Needs approval/i)).toBeNull();
  });

  it("keeps the detailed reason closed until the person asks for it", () => {
    renderBalanceAlert();

    const details = screen.getByText("Show calculation").closest("details");
    if (details === null) throw new Error("The calculation should live in a <details>.");
    expect(details).not.toHaveAttribute("open");

    fireEvent.click(screen.getByText("Show calculation"));
    expect(details).toHaveAttribute("open");
  });

  it("draws no origin stroke for alerts computed by rules", () => {
    const { container } = render(<AlertCard title="Acme has not paid the $15,000 due on 10/23" />);

    expect(container.querySelector("[data-origin-mark]")).toBeNull();
  });

  it("keeps the question and its actions at a 70ch measure inside a wide feed card", () => {
    const { container } = render(
      <AlertCard
        actions={<button type="button">Answer</button>}
        reason="$27,811.65 on 11/04"
        title="Payroll loan (Bank): what is the current outstanding balance in the app?"
        titleSize="body"
        variant="plain"
      />,
    );

    expect(container.querySelector("[data-alert-measure]")).toHaveClass("max-w-[70ch]");
    expect(container.querySelector("[data-alert-actions]")).toHaveClass("max-w-[70ch]");
    expect(screen.getByRole("heading", { name: /Payroll loan/ }).parentElement).toBe(
      container.querySelector("[data-alert-measure]"),
    );
  });

  it("leaves the framed card without the measure (narrow columns on the dashboard)", () => {
    const { container } = renderBalanceAlert();

    expect(container.querySelector("[data-alert-measure]")).not.toHaveClass("max-w-[70ch]");
    expect(container.querySelector("[data-alert-actions]")).not.toHaveClass("max-w-[70ch]");
  });
});

describe("ForecastSparkline", () => {
  it("states the minimum, the last balance and the period in text", () => {
    renderBalanceAlert();

    expect(screen.getByText("Projected balance of the main account until 12/05")).toHaveClass(
      "sr-only",
    );
    expect(screen.getByText("minimum $20,000.00")).toBeInTheDocument();
    expect(screen.getByText("$8,000.00")).toHaveClass("text-negative");
    expect(screen.getByText("11/04")).toHaveAttribute("datetime", "2026-11-04");
    expect(screen.getByText("12/05")).toHaveAttribute("datetime", "2026-12-05");
  });
});
