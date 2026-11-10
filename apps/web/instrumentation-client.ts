import { startNavigationProgress } from "@/lib/navigation-progress";

/**
 * Next.js hook (supported by Vinext) called at the start of every App Router navigation: a <Link>
 * click, `router.push`/`router.replace` and back/forward. Lights the top navigation bar at the moment
 * of the click, before the new route responds (see `lib/navigation-progress.ts`).
 */
export function onRouterTransitionStart(url: string): void {
  startNavigationProgress(url);
}
