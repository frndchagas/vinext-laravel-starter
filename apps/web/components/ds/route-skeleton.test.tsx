import { act, cleanup, render, screen } from "@testing-library/react";
import { Users } from "lucide-react";
import { afterEach, describe, expect, it } from "vitest";

import { isNavigationInProgress, resetNavigationProgress } from "@/lib/navigation-progress";

import { RouteSkeleton, SkeletonRows } from "./route-skeleton";

afterEach(() => {
  cleanup();
  act(() => resetNavigationProgress());
});

describe("RouteSkeleton", () => {
  it("shows the page's real title, announces the loading and holds the top bar", () => {
    const view = render(
      <RouteSkeleton icon={Users} label="the users" title="Users">
        <SkeletonRows rows={3} />
      </RouteSkeleton>,
    );

    const root = document.querySelector("[data-route-skeleton]");
    expect(root).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Users")).toHaveClass("text-title");
    expect(screen.getByRole("status")).toHaveTextContent("Loading the users");
    expect(isNavigationInProgress()).toBe(true);

    view.unmount();
    expect(isNavigationInProgress()).toBe(false);
  });

  it("without a title (the name comes from data), the header is gray too", () => {
    render(
      <RouteSkeleton label="the user">
        <SkeletonRows rows={1} />
      </RouteSkeleton>,
    );

    expect(document.querySelector("header [aria-hidden='true'].animate-pulse")).not.toBeNull();
  });
});
