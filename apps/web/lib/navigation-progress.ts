/**
 * State of the thin navigation bar at the top of the window (`NavigationProgress`).
 *
 * - Starts the moment the router begins a navigation to another screen: a link click,
 *   `router.push`/`router.replace` and the browser's back/forward (the `onRouterTransitionStart` of
 *   `instrumentation-client.ts` calls `startNavigationProgress`).
 * - Does not start when only the search or the hash changes (`?status=…`, `#row`): filter pills and
 *   tabs swap the URL with `replaceUrlState` and respond at once; the bar would flicker on every
 *   click. `RefreshRegion` is what shows that swap.
 * - Ends when the new route enters the screen (`commitNavigationProgress`, called by the bar when
 *   `usePathname()` changes) and while no route skeleton (`loading.tsx`) holds the bar with
 *   `holdNavigationProgress`.
 * - A navigation that never lands (error, redirect back to the same screen) releases the bar after
 *   `SAFETY_TIMEOUT_MS`.
 */

const SAFETY_TIMEOUT_MS = 15_000;

let navigating = false;
let holds = 0;
let committedPathname: string | null = null;
let safetyTimer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function clearSafetyTimer(): void {
  if (safetyTimer !== undefined) clearTimeout(safetyTimer);
  safetyTimer = undefined;
}

export function subscribeNavigationProgress(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** A navigation is under way or a route skeleton is on screen. */
export function isNavigationInProgress(): boolean {
  return navigating || holds > 0;
}

/**
 * Starts the bar for `url` (absolute or relative). Returns `false`, doing nothing, when the target is
 * another site or the same screen with a different search/hash.
 */
export function startNavigationProgress(url: string | URL): boolean {
  if (typeof window === "undefined") return false;

  let target: URL;
  try {
    target = new URL(url, window.location.href);
  } catch {
    return false;
  }
  if (target.origin !== window.location.origin) return false;
  // On back/forward the browser has already swapped the URL; the screen in view is still the one of
  // `committedPathname`.
  if (target.pathname === (committedPathname ?? window.location.pathname)) return false;

  navigating = true;
  clearSafetyTimer();
  safetyTimer = setTimeout(() => {
    safetyTimer = undefined;
    navigating = false;
    emit();
  }, SAFETY_TIMEOUT_MS);
  emit();
  return true;
}

/** The route `pathname` entered the screen: the navigation is over. */
export function commitNavigationProgress(pathname: string): void {
  committedPathname = pathname;
  if (!navigating) return;
  navigating = false;
  clearSafetyTimer();
  emit();
}

/** Holds the bar while a route skeleton is mounted; returns the function that releases it. */
export function holdNavigationProgress(): () => void {
  holds += 1;
  emit();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    holds -= 1;
    emit();
  };
}

/** Tests only: back to the initial state. */
export function resetNavigationProgress(): void {
  navigating = false;
  holds = 0;
  committedPathname = null;
  clearSafetyTimer();
  emit();
}
