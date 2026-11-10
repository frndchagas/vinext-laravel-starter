import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { Me } from "@vinext-laravel-starter/api-client";
import { afterEach, describe, expect, it, vi } from "vitest";

import SettingsPage from "./page";

const me: Me = {
  email: "jane@example.com",
  email_verified: true,
  id: "user-1",
  name: "Jane Doe",
  permissions: [],
  roles: [],
  two_factor_confirmed: false,
  two_factor_enabled: false,
};

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

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn<(href: string) => void>() }),
}));
vi.mock("@/components/authenticated-shell", () => ({
  useAuthenticatedUser: () => me,
}));
vi.mock("@/lib/use-hydrated", () => ({ useHydrated: () => true }));

let client: QueryClient;

function mount() {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <SettingsPage />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  client?.clear();
});

function section(name: string): HTMLElement {
  const heading = screen.getByRole("heading", { level: 2, name });
  const card = heading.closest("section");
  if (card === null) throw new Error(`Card ${name} not found.`);
  return card;
}

const PRIMARY = "bg-primary";

describe("settings", () => {
  it("puts each section title on the left and its fields on the right, stacked on the phone", () => {
    mount();

    expect(screen.getByRole("heading", { level: 1, name: "Settings" })).toBeInTheDocument();
    const headings = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(headings).toEqual([
      "Profile",
      "Password",
      "Two-factor authentication",
      "Appearance",
      "Delete account",
    ]);
    for (const name of headings) {
      const card = section(name ?? "");
      // Stacked on the phone; side by side from `md`.
      expect(card).toHaveClass("flex-col", "md:flex-row");
      const aside = card.querySelector("[data-settings-aside]");
      const fields = card.querySelector("[data-settings-fields]");
      expect(aside).toHaveClass("md:w-64");
      expect(aside).toContainElement(screen.getByRole("heading", { level: 2, name: name ?? "" }));
      expect(aside?.nextElementSibling).toBe(fields);
    }
    // The two-factor status sits under the description, and the fields on the right.
    const twoFactor = section("Two-factor authentication");
    expect(twoFactor.querySelector("[data-settings-aside]")).toHaveTextContent("Disabled");
    expect(twoFactor.querySelector("[data-settings-fields]")).toContainElement(
      within(twoFactor).getByLabelText("Current password"),
    );
  });

  it("asks for the current password only when the email changes, and says nothing about it before", () => {
    mount();

    const profile = section("Profile");
    expect(profile).not.toHaveTextContent(/current password/i);
    expect(within(profile).queryByLabelText("Current password")).not.toBeInTheDocument();

    fireEvent.change(within(profile).getByLabelText("Email"), {
      target: { value: "new@example.com" },
    });
    expect(within(profile).getByLabelText("Current password")).toBeRequired();
    expect(within(profile).getByRole("button", { name: "Save profile" })).toHaveClass(PRIMARY);
  });

  it("keeps every save button secondary until its own card has a pending change", () => {
    mount();

    const save = within(section("Profile")).getByRole("button", { name: "Save profile" });
    const update = within(section("Password")).getByRole("button", { name: "Update password" });
    const enable = within(section("Two-factor authentication")).getByRole("button", {
      name: "Enable two-factor authentication",
    });
    for (const button of [save, update, enable]) {
      expect(button).not.toHaveClass(PRIMARY);
      expect(button).toBeEnabled();
    }

    fireEvent.change(within(section("Profile")).getByLabelText("Name"), {
      target: { value: "Jane D." },
    });
    expect(save).toHaveClass(PRIMARY);
    expect(update).not.toHaveClass(PRIMARY);

    fireEvent.change(within(section("Password")).getByLabelText("Current password"), {
      target: { value: "secret" },
    });
    expect(update).toHaveClass(PRIMARY);
    expect(enable).not.toHaveClass(PRIMARY);

    fireEvent.change(
      within(section("Two-factor authentication")).getByLabelText("Current password"),
      { target: { value: "secret" } },
    );
    expect(enable).toHaveClass(PRIMARY);

    // Typing the previous name again clears the pending change.
    fireEvent.change(within(section("Profile")).getByLabelText("Name"), {
      target: { value: "Jane Doe" },
    });
    expect(save).not.toHaveClass(PRIMARY);
  });

  it("chooses the appearance in a segmented control, without a black button", () => {
    mount();

    const appearance = within(section("Appearance")).getByRole("radiogroup", {
      name: "Appearance",
    });
    expect(
      within(appearance)
        .getAllByRole("radio")
        .map((radio) => radio.textContent),
    ).toEqual(["System", "Light", "Dark"]);
    expect(within(section("Appearance")).queryByRole("button")).not.toBeInTheDocument();
  });
});
