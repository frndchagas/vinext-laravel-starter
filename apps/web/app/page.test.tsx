import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Home from "./page";

describe("starter home", () => {
  it("presents the architecture and the baseline decisions", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Vinext Laravel Starter" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "The baseline settles the recurring decisions." }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("A serious Laravel starting point for coding agents."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View on GitHub" })).toHaveAttribute(
      "href",
      "https://github.com/frndchagas/vinext-laravel-starter",
    );
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
    expect(screen.getByRole("link", { name: "Install" })).toHaveAttribute("href", "#install");
    expect(screen.getAllByRole("article")).toHaveLength(4);
    expect(
      screen.getByText(
        "laravel new my-app --using=frndchagas/vinext-laravel-starter --phpunit --bun --no-boost",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "TypeSpec emits OpenAPI; Orval generates Fetch, Query, Zod and MSW artifacts.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Owned snapshot, no updater")).toBeInTheDocument();
  });
});
