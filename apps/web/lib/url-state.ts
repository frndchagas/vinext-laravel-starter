/**
 * Writes a screen's state (filters, tabs, selection) to the URL without navigating. `router.replace`
 * would go through the route's `loading.tsx`, which in the production build recreates the screen:
 * panels close and the field in use loses focus. `useSearchParams` follows `replaceState`.
 */
export function replaceUrlState(href: string): void {
  window.history.replaceState(null, "", href);
}
