import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import Home from "./page";

describe("starter home", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
  });

  it("presents the architecture and the baseline decisions", () => {
    vi.stubEnv("APP_REPOSITORY_URL", "https://github.com/frndchagas/vinext-laravel-starter");
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

  it("keeps a generated application independent from the starter repository", () => {
    vi.stubEnv("APP_REPOSITORY_URL", "");
    render(<Home />);

    expect(screen.queryByRole("link", { name: "View on GitHub" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View installation" })).toHaveAttribute(
      "href",
      "#install",
    );
  });
});
