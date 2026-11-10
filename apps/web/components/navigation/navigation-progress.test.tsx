import { act, cleanup, render, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { onRouterTransitionStart } from "@/instrumentation-client";
import {
  isNavigationInProgress,
  resetNavigationProgress,
  startNavigationProgress,
} from "@/lib/navigation-progress";

import { NavigationProgress, useHoldNavigationProgress } from "./navigation-progress";

const navigation = vi.hoisted(() => ({ pathname: "/dashboard" }));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
}));

function bar(): HTMLElement | null {
  return document.querySelector("[data-navigation-progress]");
}

function fill(): HTMLElement {
  const element = bar()?.firstElementChild;
  if (!(element instanceof HTMLElement)) throw new Error("bar without a fill");
  return element;
}

function progress(): number {
  return Number(fill().style.getPropertyValue("--navigation-progress"));
}

beforeEach(() => {
  vi.useFakeTimers();
  navigation.pathname = "/dashboard";
  window.history.replaceState(null, "", "/dashboard");
  resetNavigationProgress();
});

afterEach(() => {
  cleanup();
  act(() => resetNavigationProgress());
  vi.useRealTimers();
});

describe("NavigationProgress", () => {
  it("starts on the click (onRouterTransitionStart), creeps without finishing and completes when the route enters", () => {
    const view = render(<NavigationProgress />);
    expect(bar()).toBeNull();

    act(() => onRouterTransitionStart("http://localhost:3000/settings"));
    expect(bar()).toHaveAttribute("data-navigation-progress", "running");
    expect(bar()).toHaveAttribute("aria-hidden", "true");
    const first = progress();
    expect(first).toBeGreaterThan(0);

    act(() => {
      vi.advanceTimersByTime(5_000);
    });
    expect(progress()).toBeGreaterThan(first);
    expect(progress()).toBeLessThan(0.9);

    navigation.pathname = "/settings";
    view.rerender(<NavigationProgress />);
    expect(bar()).toHaveAttribute("data-navigation-progress", "done");
    expect(progress()).toBe(1);
    expect(fill()).toHaveAttribute("data-phase", "done");

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(bar()).toBeNull();
  });

  it("does not show when only the search or the hash changes (filters, tabs)", () => {
    render(<NavigationProgress />);

    act(() => {
      onRouterTransitionStart("/dashboard?tab=activity&month=2026-11");
      onRouterTransitionStart("http://localhost:3000/dashboard?view=all");
      onRouterTransitionStart("/dashboard#row-1");
    });

    expect(isNavigationInProgress()).toBe(false);
    expect(bar()).toBeNull();
  });

  it("does not show for another site", () => {
    render(<NavigationProgress />);

    act(() => onRouterTransitionStart("https://example.com/settings"));

    expect(bar()).toBeNull();
  });

  it("on browser back, compares with the screen in view, not with the already swapped URL", () => {
    const view = render(<NavigationProgress />);
    // The browser already applied the history: the URL is /settings, but the screen is still the dashboard.
    window.history.replaceState(null, "", "/settings");

    act(() => onRouterTransitionStart(window.location.href));
    expect(bar()).toHaveAttribute("data-navigation-progress", "running");

    navigation.pathname = "/settings";
    view.rerender(<NavigationProgress />);
    expect(bar()).toHaveAttribute("data-navigation-progress", "done");
  });

  it("stays lit while the route skeleton (loading.tsx) is on screen", () => {
    const view = render(<NavigationProgress />);

    act(() => onRouterTransitionStart("/admin/users"));
    // The route skeleton enters together with the new path.
    const skeleton = renderHook(() => useHoldNavigationProgress());
    navigation.pathname = "/admin/users";
    view.rerender(<NavigationProgress />);
    expect(bar()).toHaveAttribute("data-navigation-progress", "running");

    // The real page replaces the skeleton: the bar completes.
    act(() => skeleton.unmount());
    expect(bar()).toHaveAttribute("data-navigation-progress", "done");
  });

  it("releases the bar if the navigation never lands", () => {
    render(<NavigationProgress />);

    act(() => onRouterTransitionStart("/settings"));
    expect(bar()).toHaveAttribute("data-navigation-progress", "running");

    act(() => {
      vi.advanceTimersByTime(15_000);
    });
    expect(bar()).toHaveAttribute("data-navigation-progress", "done");
  });

  it("sits still at full width with prefers-reduced-motion", () => {
    render(<NavigationProgress />);

    act(() => onRouterTransitionStart("/design-system"));

    expect(fill()).toHaveClass(
      "motion-reduce:[transform:none]",
      "motion-reduce:transition-none",
      "motion-reduce:data-[phase=done]:opacity-0",
    );
  });
});

describe("startNavigationProgress", () => {
  it("says whether it started", () => {
    expect(startNavigationProgress("/dashboard?page=2")).toBe(false);
    expect(startNavigationProgress("/settings")).toBe(true);
    expect(isNavigationInProgress()).toBe(true);
  });
});
