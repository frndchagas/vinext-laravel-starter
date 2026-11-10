import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import DesignSystemPage from "./page";

// The appearance reads the system theme when the module loads; jsdom has no `matchMedia`.
vi.hoisted(() => {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (query: string) => ({
      addEventListener: () => undefined,
      matches: false,
      media: query,
      removeEventListener: () => undefined,
    }),
    writable: true,
  });
});

afterEach(cleanup);

describe("DesignSystemPage", () => {
  it("renders every section of the showcase with generic content", () => {
    render(<DesignSystemPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Design system" })).toBeInTheDocument();

    for (const title of [
      "Colours",
      "Typography",
      "Controls, pills and states",
      "Date",
      "Alert",
      "Voice and text",
      "Indicators",
      "Table with collapsible groups",
      "Long table with a sticky header",
      "Refresh and progress",
      "Charts",
      "Example: dashboard",
      "Example: inbox",
      "Toast",
    ]) {
      expect(screen.getByRole("heading", { level: 2, name: title })).toBeInTheDocument();
    }
  });

  it("keeps the theme switch as a radiogroup on the light default and no domain strings", () => {
    render(<DesignSystemPage />);

    // Desktop and phone placements render both in jsdom; each starts on "Light".
    const themes = screen.getAllByRole("radiogroup", { name: "Theme" });
    expect(themes).toHaveLength(2);
    for (const group of themes) {
      expect(within(group).getByRole("radio", { name: "Light" })).toBeChecked();
    }

    // The fictional data stays in US English with dollars: no leftover domain strings.
    expect(screen.getAllByText("Acme Inc.").length).toBeGreaterThan(0);
    expect(document.body.textContent).not.toMatch(/R\$|Forte|Pessoal/);
  });
});
