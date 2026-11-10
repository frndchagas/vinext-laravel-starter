import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RefreshRegion } from "./refresh-region";

describe("RefreshRegion", () => {
  it("keeps the content, dims it and shows the bar while busy", () => {
    const { container } = render(
      <RefreshRegion busy className="rounded-card" data-testid="region">
        <p>Balance $10</p>
      </RefreshRegion>,
    );

    const region = screen.getByTestId("region");
    expect(region).toHaveAttribute("aria-busy", "true");
    expect(region).toHaveClass("rounded-card");
    expect(screen.getByText("Balance $10")).toBeInTheDocument();
    expect(container.querySelector("[data-refresh-bar]")).toHaveAttribute("aria-hidden", "true");
  });

  it("leaves the bar out when asked and when idle", () => {
    const { container, rerender } = render(
      <RefreshRegion bar={false} busy>
        <p>Totals</p>
      </RefreshRegion>,
    );
    expect(container.querySelector("[data-refresh-bar]")).not.toBeInTheDocument();

    rerender(
      <RefreshRegion busy={false}>
        <p>Totals</p>
      </RefreshRegion>,
    );
    expect(container.firstElementChild).toHaveAttribute("aria-busy", "false");
    expect(container.querySelector("[data-refresh-bar]")).not.toBeInTheDocument();
  });

  it("announces the results politely only once they arrive", () => {
    const { rerender } = render(
      <RefreshRegion announcement="12 users" busy>
        <p>List</p>
      </RefreshRegion>,
    );
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toBeEmptyDOMElement();

    rerender(
      <RefreshRegion announcement="12 users" busy={false}>
        <p>List</p>
      </RefreshRegion>,
    );
    expect(status).toHaveTextContent("12 users");
  });
});
