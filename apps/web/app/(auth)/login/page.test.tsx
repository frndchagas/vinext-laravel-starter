import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import LoginPage from "./page";

let search = "";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn<(href: string) => void>() }),
  useSearchParams: () => new URLSearchParams(search),
}));

let client: QueryClient;

function mount(response: () => Promise<Response>, query = "") {
  search = query;
  const fetchMock = vi.fn<typeof fetch>(response);
  vi.stubGlobal("fetch", fetchMock);
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <LoginPage />
    </QueryClientProvider>,
  );

  return fetchMock;
}

afterEach(() => {
  cleanup();
  client?.clear();
  vi.unstubAllGlobals();
});

describe("create account link", () => {
  it("offers Create account when registration is open", async () => {
    mount(async () => Response.json({ registration: true }));

    expect(await screen.findByRole("link", { name: "Create account" })).toHaveAttribute(
      "href",
      "/register",
    );
    expect(screen.getByRole("link", { name: "Forgot password?" })).toBeInTheDocument();
  });

  it("hides Create account when the deployment does not accept public registrations", async () => {
    const fetchMock = mount(async () => Response.json({ registration: false }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(await screen.findByRole("link", { name: "Forgot password?" })).toBeInTheDocument();
    await waitFor(() => expect(client.isFetching()).toBe(0));
    expect(screen.queryByRole("link", { name: "Create account" })).not.toBeInTheDocument();
  });

  it("hides Create account while registration availability is unknown", () => {
    mount(() => new Promise<Response>(() => undefined));

    expect(screen.getByRole("link", { name: "Forgot password?" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Create account" })).not.toBeInTheDocument();
  });
});

describe("notices from the query string", () => {
  it("confirms a password update", () => {
    mount(async () => Response.json({ registration: false }), "password_updated=1");

    expect(screen.getByRole("status")).toHaveTextContent("Password updated. Sign in again.");
  });

  it("confirms an account deletion", () => {
    mount(async () => Response.json({ registration: false }), "account_deleted=1");

    expect(screen.getByRole("status")).toHaveTextContent("Account deleted.");
  });
});
