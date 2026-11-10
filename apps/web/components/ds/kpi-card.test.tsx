import { cleanup, render, screen } from "@testing-library/react";
import { Users } from "lucide-react";
import { afterEach, describe, expect, it } from "vitest";

import { deltaContext, KpiCard } from "./kpi-card";

afterEach(cleanup);

describe("KpiCard", () => {
  it("names the card by its label and reads the delta pill with its trend", () => {
    render(
      <KpiCard
        context={deltaContext({ comparison: "vs last week", ratio: 0.12 })}
        icon={Users}
        label="Active users"
        value="128"
      />,
    );

    const card = screen.getByRole("region", { name: "Active users" });
    expect(card).toHaveTextContent("128");
    const pill = screen.getByText("+12.0%");
    expect(pill).toHaveClass("text-positive");
    expect(pill).toHaveTextContent("+12.0%, better");
    expect(card).toHaveTextContent("vs last week");
  });

  it("stretches the single footer link over the whole card", () => {
    render(
      <KpiCard
        cta={{
          ariaLabel: "Sessions: view all",
          href: "/settings#sessions",
          label: "View sessions",
        }}
        label="Sessions"
        sparkline={[1, 3, 2, 4]}
        value="4"
      />,
    );

    const link = screen.getByRole("link", { name: "Sessions: view all" });
    expect(link).toHaveAttribute("href", "/settings#sessions");
    expect(link).toHaveClass("after:absolute", "after:inset-0");
    expect(screen.getByRole("region", { name: "Sessions" })).toHaveClass("relative");
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });
});
