"use client";

import { useSyncExternalStore } from "react";

export type ResolvedAppearance = "light" | "dark";
export type Appearance = ResolvedAppearance | "system";

const listeners = new Set<() => void>();
/** Design-system default: light. "system" follows the operating system when chosen. */
export const DEFAULT_APPEARANCE: Appearance = "light";
let currentAppearance: Appearance = DEFAULT_APPEARANCE;
let initialized = false;

function prefersDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function isAppearance(value: string | null): value is Appearance {
  return value === "light" || value === "dark" || value === "system";
}

function readAppearance(): Appearance {
  if (typeof window === "undefined") return DEFAULT_APPEARANCE;

  const stored = window.localStorage.getItem("appearance");
  return isAppearance(stored) ? stored : DEFAULT_APPEARANCE;
}

function resolveAppearance(appearance: Appearance): ResolvedAppearance {
  return appearance === "dark" || (appearance === "system" && prefersDark()) ? "dark" : "light";
}

function applyAppearance(appearance: Appearance): void {
  if (typeof document === "undefined") return;

  const resolved = resolveAppearance(appearance);
  document.documentElement.classList.toggle("dark", resolved === "dark");
  document.documentElement.style.colorScheme = resolved;
}

function setAppearanceCookie(appearance: Appearance): void {
  const maxAge = 365 * 24 * 60 * 60;
  document.cookie = `appearance=${appearance};path=/;max-age=${maxAge};SameSite=Lax`;
}

function initializeAppearance(): void {
  if (initialized || typeof window === "undefined") return;

  initialized = true;
  currentAppearance = readAppearance();
  applyAppearance(currentAppearance);
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (currentAppearance === "system") applyAppearance(currentAppearance);
  });
}

initializeAppearance();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function updateAppearance(nextAppearance: Appearance): void {
  currentAppearance = nextAppearance;
  window.localStorage.setItem("appearance", nextAppearance);
  setAppearanceCookie(nextAppearance);
  applyAppearance(nextAppearance);
  listeners.forEach((listener) => listener());
}

export function useAppearance() {
  const appearance = useSyncExternalStore(
    subscribe,
    () => currentAppearance,
    () => DEFAULT_APPEARANCE,
  );

  return {
    appearance,
    resolvedAppearance: resolveAppearance(appearance),
    updateAppearance,
  } as const;
}
