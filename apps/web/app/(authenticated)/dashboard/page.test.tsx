import { act, cleanup, render, screen, within } from "@testing-library/react";
import type { Me } from "@vinext-laravel-starter/api-client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import DashboardPage from "./page";

const session = vi.hoisted(() => ({
  me: undefined as Me | undefined,
}));

vi.mock("@/components/authenticated-shell", () => ({
  useAuthenticatedUser: () => {
    if (session.me === undefined) throw new Error("No user in the test session.");
    return session.me;
  },
}));

/** Fake Echo channel: the test fires `subscribed` or `error` itself. */
const echo = vi.hoisted(() => {
  const handlers = { error: [] as Array<() => void>, subscribed: [] as Array<() => void> };
  const channel = {
    error: (callback: () => void) => {
      handlers.error.push(callback);
      return channel;
    },
    subscribed: (callback: () => void) => {
      handlers.subscribed.push(callback);
      return channel;
    },
  };
  return {
    handlers,
    leave: vi.fn<(name: string) => void>(),
    private: vi.fn<(name: string) => typeof channel>(() => channel),
  };
});

vi.mock("@/lib/echo", () => ({
  getEcho: () => echo,
}));

const ME: Me = {
  email: "ada@example.com",
  email_verified: true,
  id: "user-1",
  name: "Ada Lovelace",
  permissions: ["users.view", "users.manage"],
  roles: ["member"],
  two_factor_confirmed: true,
  two_factor_enabled: true,
};

beforeEach(() => {
  session.me = ME;
  echo.handlers.error = [];
  echo.handlers.subscribed = [];
});

afterEach(() => {
  cleanup();
  echo.leave.mockReset();
  echo.private.mockClear();
});

describe("dashboard", () => {
  it("greets by first name and shows only what the session knows about the account", () => {
    render(<DashboardPage />);

    expect(screen.getByRole("heading", { level: 1, name: /, Ada!$/ })).toBeInTheDocument();
    expect(screen.getByText("Dashboard")).toBeInTheDocument();

    const strip = screen.getByRole("region", { name: "Account at a glance" });
    expect(within(strip).getByText("Verified")).toBeInTheDocument();
    expect(within(strip).getByText("ada@example.com")).toBeInTheDocument();
    expect(within(strip).getByText("Active")).toBeInTheDocument();
    expect(within(strip).getByText("2")).toBeInTheDocument();
    expect(within(strip).getByRole("link", { name: "Security settings" })).toHaveAttribute(
      "href",
      "/settings",
    );

    const account = screen.getByRole("list", { name: "Account state" });
    expect(within(account).getByText("Email verified")).toBeInTheDocument();
    expect(within(account).getByText("member")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Manage account" })).toHaveAttribute(
      "href",
      "/settings",
    );
  });

  it("flags an unverified email, a pending two-factor setup and a missing role", () => {
    session.me = {
      ...ME,
      email_verified: false,
      permissions: [],
      roles: [],
      two_factor_confirmed: false,
    };
    render(<DashboardPage />);

    const strip = screen.getByRole("region", { name: "Account at a glance" });
    expect(within(strip).getByText("Unverified")).toBeInTheDocument();
    expect(within(strip).getByText("Pending confirmation")).toBeInTheDocument();
    expect(within(strip).getByText("0")).toBeInTheDocument();
    expect(screen.getByText("Email not verified")).toBeInTheDocument();
    expect(screen.getByText("No role assigned")).toBeInTheDocument();
    expect(screen.getByText("none")).toBeInTheDocument();
  });

  it("subscribes to the private user channel and reports the connection state", () => {
    render(<DashboardPage />);

    expect(echo.private).toHaveBeenCalledWith("users.user-1");
    // Status line and the "Private channel" detail both say it.
    expect(screen.getAllByText("Connecting…")).toHaveLength(2);

    act(() => {
      for (const callback of echo.handlers.subscribed) callback();
    });

    expect(screen.getByText("Realtime connected")).toBeInTheDocument();
    expect(screen.getByText("Session details")).toBeInTheDocument();
    expect(screen.getByText("Subscribed to users.user-1")).toBeInTheDocument();
    expect(screen.getByText("user-1")).toBeInTheDocument();
    expect(screen.getByText("users.view, users.manage")).toBeInTheDocument();
  });

  it("reports an unavailable channel and leaves it on unmount", () => {
    const { unmount } = render(<DashboardPage />);

    act(() => {
      for (const callback of echo.handlers.error) callback();
    });

    expect(screen.getAllByText("Realtime unavailable")).toHaveLength(2);

    unmount();
    expect(echo.leave).toHaveBeenCalledWith("users.user-1");
  });
});
