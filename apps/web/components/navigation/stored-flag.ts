"use client";

import { useSyncExternalStore } from "react";

/**
 * Boolean preference of this browser (sidebar collapsed, a group open) in `localStorage`, with
 * try/catch: in private browsing or with storage blocked, it lasts until reload. On the server and
 * during hydration, the fallback; afterwards, the stored value. Open tabs follow through the
 * `storage` event.
 */
const listeners = new Map<string, Set<() => void>>();
const memory = new Map<string, boolean>();

function read(key: string, fallback: boolean): boolean {
  try {
    const stored = window.localStorage.getItem(key);
    if (stored === "1" || stored === "open") return true;
    if (stored === "0" || stored === "closed") return false;
    return fallback;
  } catch {
    // Storage blocked: what was chosen on this page counts.
    return memory.get(key) ?? fallback;
  }
}

function notify(key: string): void {
  listeners.get(key)?.forEach((listener) => listener());
}

export function writeStoredFlag(key: string, value: boolean): void {
  memory.set(key, value);
  try {
    window.localStorage.setItem(key, value ? "1" : "0");
  } catch {
    // Private browsing or storage blocked: the state lasts until reload.
  }
  notify(key);
}

export function useStoredFlag(key: string, fallback: boolean): [boolean, (value: boolean) => void] {
  const value = useSyncExternalStore(
    (listener) => {
      const set = listeners.get(key) ?? new Set<() => void>();
      set.add(listener);
      listeners.set(key, set);
      const onStorage = (event: StorageEvent) => {
        if (event.key === key) listener();
      };
      window.addEventListener("storage", onStorage);
      return () => {
        set.delete(listener);
        window.removeEventListener("storage", onStorage);
      };
    },
    () => read(key, fallback),
    () => fallback,
  );

  return [value, (next: boolean) => writeStoredFlag(key, next)];
}
