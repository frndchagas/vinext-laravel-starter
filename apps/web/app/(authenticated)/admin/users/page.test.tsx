import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { AdminUser, Me } from "@vinext-laravel-starter/api-client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import AdminUsersPage from "./page";

const session = vi.hoisted(() => ({
  me: undefined as Me | undefined,
}));

vi.mock("@/components/authenticated-shell", () => ({
  useAuthenticatedUser: () => {
    if (session.me === undefined) throw new Error("No user in the test session.");
    return session.me;
  },
}));

const ME: Me = {
  email: "admin@example.com",
  email_verified: true,
  id: "user-admin",
  name: "Grace Hopper",
  permissions: ["users.view", "users.manage"],
  roles: ["admin"],
  two_factor_confirmed: false,
  two_factor_enabled: false,
};

const USERS: AdminUser[] = [
  {
    created_at: "2026-01-15T10:00:00+00:00",
    email: "admin@example.com",
    email_verified: true,
    id: "user-admin",
    name: "Grace Hopper",
    roles: ["admin"],
  },
  {
    created_at: "2026-03-02T09:30:00+00:00",
    email: "ada@example.com",
    email_verified: false,
    id: "user-ada",
    name: "Ada Lovelace",
    roles: ["member"],
  },
];

type Route = (request: { method: string; url: URL; body: unknown }) => Response;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status,
  });

const listResponse = (data: AdminUser[]) =>
  json(200, { data, meta: { next_cursor: null, prev_cursor: null } });

/** Stubs `fetch` with one handler and records every request that reached the API. */
function stubApi(route: Route) {
  const requests: Array<{ method: string; url: URL; body: unknown }> = [];
  const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input), "http://app");
    const method = (init?.method ?? "GET").toUpperCase();
    if (url.pathname === "/sanctum/csrf-cookie") return new Response(null, { status: 204 });

    const body = typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
    const request = { body, method, url };
    requests.push(request);
    return route(request);
  });
  vi.stubGlobal("fetch", fetchMock);

  return requests;
}

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <AdminUsersPage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  session.me = ME;
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("admin users", () => {
  it("asks for the users.view permission before listing anyone", () => {
    session.me = { ...ME, permissions: [] };
    stubApi(() => listResponse(USERS));
    mount();

    expect(
      screen.getByRole("heading", { level: 1, name: "User access required" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("lists users with verification, creation date and an editable role", async () => {
    stubApi(() => listResponse(USERS));
    mount();

    expect(screen.getByRole("heading", { level: 1, name: "Users" })).toBeInTheDocument();
    const table = await screen.findByRole("table", { name: "Users and their assigned roles" });

    const own = within(table).getByRole("row", { name: /admin@example\.com/ });
    expect(within(own).getByText("Grace Hopper")).toBeInTheDocument();
    expect(within(own).getByText("Verified")).toBeInTheDocument();
    expect(within(own).getByText("Jan 15, 2026")).toBeInTheDocument();
    expect(within(own).getByText("Current account")).toBeInTheDocument();
    expect(within(own).getByLabelText("Role for Grace Hopper")).toBeDisabled();

    const other = within(table).getByRole("row", { name: /ada@example\.com/ });
    expect(within(other).getByText("Unverified")).toBeInTheDocument();
    expect(within(other).getByLabelText("Role for Ada Lovelace")).toHaveValue("member");
    expect(within(other).getByLabelText("Role for Ada Lovelace")).toBeEnabled();
  });

  it("keeps the role selects read-only without users.manage", async () => {
    session.me = { ...ME, permissions: ["users.view"] };
    stubApi(() => listResponse(USERS));
    mount();

    expect(await screen.findByLabelText("Role for Ada Lovelace")).toBeDisabled();
  });

  it("searches by name or email and resets the cursor", async () => {
    const requests = stubApi(({ url }) =>
      listResponse(url.searchParams.get("search") === "ada" ? [USERS[1]!] : USERS),
    );
    mount();
    await screen.findByText("Grace Hopper");

    fireEvent.change(screen.getByLabelText("Search users"), { target: { value: "  ada " } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    await waitFor(() => expect(screen.queryByText("Grace Hopper")).not.toBeInTheDocument());
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    const last = requests.at(-1)!;
    expect(last.url.pathname).toBe("/api/v1/admin/users");
    expect(last.url.searchParams.get("search")).toBe("ada");
    expect(last.url.searchParams.get("per_page")).toBe("20");
    expect(last.url.searchParams.has("cursor")).toBe(false);
  });

  it("changes a role through the API and confirms it", async () => {
    const requests = stubApi(({ method, url }) => {
      if (method === "PATCH" && url.pathname === "/api/v1/admin/users/user-ada/role") {
        return json(200, { ...USERS[1]!, roles: ["admin"] });
      }
      return listResponse(USERS);
    });
    mount();

    const select = await screen.findByLabelText("Role for Ada Lovelace");
    fireEvent.change(select, { target: { value: "admin" } });

    expect(await screen.findByText("Ada Lovelace is now admin.")).toBeInTheDocument();
    const patch = requests.find((request) => request.method === "PATCH");
    expect(patch?.body).toEqual({ role: "admin" });
    // The list is refetched after the change.
    await waitFor(() =>
      expect(requests.filter((request) => request.method === "GET").length).toBeGreaterThan(1),
    );
  });

  it("says when no user matches and when the list cannot be loaded", async () => {
    stubApi(() => listResponse([]));
    mount();
    expect(await screen.findByText("No users match this search")).toBeInTheDocument();
    cleanup();

    stubApi(() =>
      json(403, {
        detail: "Forbidden by policy.",
        status: 403,
        title: "Forbidden",
        type: "about:blank",
      }),
    );
    mount();
    expect(await screen.findByRole("heading", { name: "Users unavailable" })).toBeInTheDocument();
    expect(screen.getByText("Forbidden by policy.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});
