import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { Me } from "@vinext-laravel-starter/api-client";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AuthenticatedShell, useNavigationHighlight } from "./authenticated-shell";

const navigation = vi.hoisted(() => ({
  pathname: "/dashboard",
  push: vi.fn<(href: string) => void>(),
  replace: vi.fn<(href: string) => void>(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ push: navigation.push, replace: navigation.replace }),
}));

const me: Me = {
  email: "ada@example.com",
  email_verified: true,
  id: "user-1",
  name: "Ada Lovelace",
  permissions: [],
  roles: ["member"],
  two_factor_confirmed: false,
  two_factor_enabled: false,
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.localStorage.clear();
  navigation.pathname = "/dashboard";
  navigation.push.mockReset();
  navigation.replace.mockReset();
});

/** Fake fetch answering by URL path (no query) with JSON; records the requests made. */
function stubApi(routes: Record<string, unknown>) {
  const requests: Array<{ method: string; path: string }> = [];
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(async (input, init) => {
      const url = new URL(
        typeof input === "string" ? input : input instanceof URL ? input.href : input.url,
        "http://localhost",
      );
      requests.push({ method: init?.method ?? "GET", path: url.pathname });
      const body = routes[url.pathname];
      if (body === null) return new Response(null, { status: 204 });
      return body === undefined
        ? Response.json({ status: 404, title: "Not Found", type: "about:blank" }, { status: 404 })
        : Response.json(body);
    }),
  );
  return requests;
}

function stubShell(overrides: Record<string, unknown> = {}) {
  return stubApi({ "/api/v1/me": me, ...overrides });
}

function HighlightingPage({ href }: { href: string }) {
  useNavigationHighlight(href);
  return <p>detail</p>;
}

function mount(children: ReactNode = <p>content</p>) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <AuthenticatedShell siteName="Acme Admin">{children}</AuthenticatedShell>
    </QueryClientProvider>,
  );
}

/** The skeleton frame already has the menu; waits for the session to load. */
async function waitForSession() {
  await waitFor(() => expect(document.querySelector('[data-shell="loading"]')).toBeNull());
}

async function openAccountMenu() {
  fireEvent.click(await screen.findByRole("button", { name: "Account: Ada Lovelace. Open menu" }));
  return screen.findByRole("menu");
}

describe("AuthenticatedShell", () => {
  it("shows the app frame as a skeleton while confirming the session, without a loading screen", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(() => new Promise<Response>(() => undefined)),
    );
    mount();

    expect(document.querySelector('[data-shell="loading"]')).not.toBeNull();
    expect(screen.getByRole("navigation", { name: "Primary" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/dashboard");
    // Permission-gated items wait for the session.
    expect(screen.queryByRole("link", { name: "Users" })).toBeNull();
    expect(screen.getByRole("main")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Loading session")).toHaveClass("sr-only");
    expect(screen.queryByText("content")).toBeNull();
  });

  it("organizes the menu in General and Developer sections with the brand on top", async () => {
    stubShell();
    mount();
    await waitForSession();

    const nav = screen.getByRole("navigation", { name: "Primary" });
    expect(
      within(nav)
        .getAllByRole("heading", { level: 2 })
        .map((heading) => heading.textContent),
    ).toEqual(["General", "Developer"]);

    const general = within(nav).getByRole("region", { name: "General" });
    expect(
      within(general)
        .getAllByRole("link")
        .map((link) => [link.textContent, link.getAttribute("href")]),
    ).toEqual([
      ["Dashboard", "/dashboard"],
      ["Settings", "/settings"],
    ]);
    expect(within(general).getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(general).getByRole("link", { name: "Settings" })).not.toHaveAttribute(
      "aria-current",
    );

    const developer = within(nav).getByRole("region", { name: "Developer" });
    expect(within(developer).getByRole("link", { name: "Design system" })).toHaveAttribute(
      "href",
      "/design-system",
    );

    expect(screen.getAllByRole("link", { name: "Acme Admin: go to the start" })[0]).toHaveAttribute(
      "href",
      "/dashboard",
    );
    expect(screen.getByText("content")).toBeInTheDocument();
  });

  it("shows the Admin section only with the users.view permission", async () => {
    stubShell({ "/api/v1/me": { ...me, permissions: ["users.view"] } });
    mount();
    await waitForSession();

    const nav = screen.getByRole("navigation", { name: "Primary" });
    expect(
      within(nav)
        .getAllByRole("heading", { level: 2 })
        .map((heading) => heading.textContent),
    ).toEqual(["General", "Admin", "Developer"]);
    expect(within(nav).getByRole("link", { name: "Users" })).toHaveAttribute(
      "href",
      "/admin/users",
    );
  });

  it("hides Users without the permission", async () => {
    stubShell();
    mount();
    await waitForSession();

    expect(screen.queryByRole("link", { name: "Users" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Admin" })).not.toBeInTheDocument();
  });

  it("marks a nested route as active under its item", async () => {
    navigation.pathname = "/admin/users/user-9";
    stubShell({ "/api/v1/me": { ...me, permissions: ["users.view"] } });
    mount();
    await waitForSession();

    expect(screen.getByRole("link", { name: "Users" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Dashboard" })).not.toHaveAttribute("aria-current");
  });

  it("collapses the menu into an icon rail, with the names for screen readers, and remembers it", async () => {
    stubShell();
    mount();
    await waitForSession();

    fireEvent.click(screen.getByRole("button", { name: "Collapse menu" }));

    expect(document.querySelector("aside")).toHaveAttribute("data-collapsed");
    expect(window.localStorage.getItem("nav-collapsed")).toBe("1");
    const nav = screen.getByRole("navigation", { name: "Primary" });
    expect(within(nav).getByRole("link", { name: "Settings" })).toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: "Settings" }).textContent).toBe("Settings");
    expect(screen.getByRole("link", { name: "Acme Admin: go to the dashboard" })).toHaveAttribute(
      "href",
      "/dashboard",
    );

    fireEvent.click(screen.getByRole("button", { name: "Expand menu" }));
    expect(document.querySelector("aside")).not.toHaveAttribute("data-collapsed");
    expect(window.localStorage.getItem("nav-collapsed")).toBe("0");
  });

  it("comes back collapsed when the browser remembers it", async () => {
    window.localStorage.setItem("nav-collapsed", "1");
    stubShell();
    mount();
    await waitForSession();

    expect(screen.getByRole("button", { name: "Expand menu" })).toBeInTheDocument();
    expect(document.querySelector("aside")).toHaveAttribute("data-collapsed");
  });

  it("keeps only the account in the user menu: Settings and Sign out", async () => {
    stubShell();
    mount();

    expect(await screen.findByText("ada@example.com")).toBeInTheDocument();

    const menu = await openAccountMenu();
    expect(within(menu).getByRole("menuitem", { name: "Settings" })).toHaveAttribute(
      "href",
      "/settings",
    );
    expect(within(menu).getByRole("menuitem", { name: "Sign out" })).toBeInTheDocument();
    expect(within(menu).getAllByRole("menuitem")).toHaveLength(2);
  });

  it("highlights the current page inside the user menu like the active sidebar item", async () => {
    navigation.pathname = "/settings";
    stubShell();
    mount();

    fireEvent.click(
      await screen.findByRole("button", { name: "Account: Ada Lovelace, on Settings. Open menu" }),
    );
    const menu = await screen.findByRole("menu");
    const current = within(menu).getByRole("menuitem", { name: "Settings" });
    expect(current).toHaveAttribute("aria-current", "page");
    expect(current.className).toContain("aria-[current=page]:bg-sidebar-accent");
    expect(current.className).toContain("aria-[current=page]:font-medium");
  });

  it("closes the user menu after choosing a link", async () => {
    stubShell();
    mount();

    const menu = await openAccountMenu();
    fireEvent.click(within(menu).getByRole("menuitem", { name: "Settings" }));

    await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
  });

  it("signs out through the user menu and goes to the login", async () => {
    const requests = stubShell({ "/api/v1/auth/logout": null, "/api/v1/csrf-cookie": null });
    mount();

    const menu = await openAccountMenu();
    fireEvent.click(within(menu).getByRole("menuitem", { name: "Sign out" }));

    await waitFor(() => expect(navigation.push).toHaveBeenCalledWith("/login"));
    expect(requests.some(({ method }) => method === "POST")).toBe(true);
  });

  it("sends an unauthenticated session to the login", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async () =>
        Response.json(
          { status: 401, title: "Unauthenticated", type: "about:blank" },
          { status: 401 },
        ),
      ),
    );
    mount();

    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/login"));
  });

  it("sends an unverified user to the verification screen", async () => {
    stubShell({ "/api/v1/me": { ...me, email_verified: false } });
    mount();

    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/verify-email"));
  });

  it("lets a page mark another item as active with useNavigationHighlight", async () => {
    navigation.pathname = "/reports/report-1";
    stubShell();
    mount(<HighlightingPage href="/settings?tab=profile" />);
    await waitForSession();

    const nav = screen.getByRole("navigation", { name: "Primary" });
    await waitFor(() =>
      expect(within(nav).getByRole("link", { name: "Settings" })).toHaveAttribute(
        "aria-current",
        "page",
      ),
    );
    expect(within(nav).getByRole("link", { name: "Dashboard" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("marks the clicked item as pending at the moment of the click, open and collapsed", async () => {
    stubShell();
    mount();
    await waitForSession();
    const nav = screen.getByRole("navigation", { name: "Primary" });

    const settings = within(nav).getByRole("link", { name: "Settings" });
    expect(settings.querySelector("[data-nav-pending]")).toBeNull();
    fireEvent.click(settings);
    expect(settings.querySelector("[data-nav-pending]")).toHaveClass(
      "animate-spin",
      "motion-reduce:animate-none",
    );
    expect(settings).toHaveClass("has-data-nav-pending:bg-sidebar-accent");
    // Only the clicked item spins.
    expect(
      within(nav).getByRole("link", { name: "Dashboard" }).querySelector("[data-nav-pending]"),
    ).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Collapse menu" }));
    const rail = within(screen.getByRole("navigation", { name: "Primary" })).getByRole("link", {
      name: "Design system",
    });
    fireEvent.click(rail);
    expect(rail.querySelector("[data-nav-pending]")).toHaveClass("absolute");
  });

  it("shows the session error with a retry when Laravel does not answer", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );
    mount();

    expect(await screen.findByRole("heading", { name: "Session unavailable" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});
