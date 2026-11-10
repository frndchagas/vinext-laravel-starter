import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import RegisterPage from "./page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn<(href: string) => void>() }),
}));

let client: QueryClient;

function mountWithRegistration(registration: boolean) {
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(async () => Response.json({ registration })),
  );
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <RegisterPage />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  client?.clear();
  vi.unstubAllGlobals();
});

describe("registration", () => {
  it("refuses registration when the deployment does not accept public registrations", async () => {
    mountWithRegistration(false);

    expect(await screen.findByRole("heading", { name: "Registration unavailable" })).toBeVisible();
    expect(screen.queryByLabelText("Name")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
  });

  it("shows the form when registration is open", async () => {
    mountWithRegistration(true);

    expect(await screen.findByLabelText("Name")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Registration unavailable" }),
    ).not.toBeInTheDocument();
  });
});
