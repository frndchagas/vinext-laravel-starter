"use client";

import { usePathname } from "next/navigation";
import { type CSSProperties, useEffect, useState, useSyncExternalStore } from "react";

import {
  commitNavigationProgress,
  isNavigationInProgress,
  subscribeNavigationProgress,
} from "@/lib/navigation-progress";

export {
  HoldNavigationProgress,
  useHoldNavigationProgress,
} from "@/components/ds/hold-navigation-progress";

/** Where the bar stops while it waits: it never reaches the end before the route enters. */
const CEILING = 0.9;
const START = 0.12;
const TRICKLE_MS = 250;
/** After completing, the full bar fades over 200 ms before leaving the DOM. */
const FADE_MS = 300;

type Phase = "idle" | "running" | "done";

/**
 * Thin bar (2 px) at the top of the window, in the primary colour, while a navigation to another
 * screen is under way (see `lib/navigation-progress.ts`). Appears on the click, creeps up to 90% and
 * completes when the new route enters. With `prefers-reduced-motion`, it sits still at full width,
 * without sliding or fading. Decorative (`aria-hidden`): the route skeleton announces the loading.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const active = useSyncExternalStore(
    subscribeNavigationProgress,
    isNavigationInProgress,
    () => false,
  );
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [wasActive, setWasActive] = useState(active);

  // Starts and completes in the same render in which the navigation state changes (no effect).
  if (active !== wasActive) {
    setWasActive(active);
    if (active) {
      setPhase("running");
      // A new navigation right after another completes starts over.
      setProgress((current) => (current >= 1 ? START : Math.max(current, START)));
    } else if (phase === "running") {
      setPhase("done");
      setProgress(1);
    }
  }

  useEffect(() => {
    commitNavigationProgress(pathname);
  }, [pathname]);

  useEffect(() => {
    if (phase !== "running") return undefined;
    const trickle = setInterval(() => {
      setProgress((current) => current + (CEILING - current) * 0.12);
    }, TRICKLE_MS);
    return () => clearInterval(trickle);
  }, [phase]);

  useEffect(() => {
    if (phase !== "done") return undefined;
    const hide = setTimeout(() => {
      setPhase("idle");
      setProgress(0);
    }, FADE_MS);
    return () => clearTimeout(hide);
  }, [phase]);

  if (phase === "idle") return null;

  const style: CSSProperties & Record<`--${string}`, number> = {
    "--navigation-progress": progress,
  };

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-60 h-0.5"
      data-navigation-progress={phase}
    >
      <div
        className="h-full origin-left [transform:scaleX(var(--navigation-progress))] bg-primary shadow-[0_0_8px_var(--primary)] transition-[transform,opacity] duration-200 ease-out data-[phase=done]:opacity-0 motion-reduce:[transform:none] motion-reduce:opacity-60 motion-reduce:transition-none motion-reduce:data-[phase=done]:opacity-0"
        data-phase={phase}
        style={style}
      />
    </div>
  );
}
