"use client";

import { useEffect } from "react";

import { holdNavigationProgress } from "@/lib/navigation-progress";

/** Holds the top navigation bar while the component is mounted (a `loading.tsx` skeleton). */
export function useHoldNavigationProgress(): void {
  useEffect(() => holdNavigationProgress(), []);
}

/** `useHoldNavigationProgress` as a component, for server-rendered skeletons (`RouteSkeleton`). */
export function HoldNavigationProgress(): null {
  useHoldNavigationProgress();
  return null;
}
