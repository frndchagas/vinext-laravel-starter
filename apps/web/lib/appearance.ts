"use client";

import { useSyncExternalStore } from "react";

export type ResolvedAppearance = "light" | "dark";
export type Appearance = ResolvedAppearance | "system";

const listeners = new Set<() => void>();
let currentAppearance: Appearance = "system";
let initialized = false;

function prefersDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function isAppearance(value: string | null): value is Appearance {
  return value === "light" || value === "dark" || value === "system";
}

function readAppearance(): Appearance {
  if (typeof window === "undefined") return "system";

  const stored = window.localStorage.getItem("appearance");
  return isAppearance(stored) ? stored : "system";
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
    () => "system" as const,
  );

  return {
    appearance,
    resolvedAppearance: resolveAppearance(appearance),
    updateAppearance,
  } as const;
}
