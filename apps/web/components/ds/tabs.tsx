"use client";

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import { ChevronLeft, ChevronRight, type LucideIcon } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { CountPill } from "./pill";

export type TabOption<T extends string> = {
  value: T;
  label: string;
  icon?: LucideIcon;
  count?: number;
  /** Counter text for screen readers ("open questions"). */
  countLabel?: string;
};

type Overflow = {
  end: boolean;
  start: boolean;
  /** Tail of a tab cut right after the left button (px), hidden by the mask. */
  startTail?: number;
};

/** Gap between tabs (`gap-6`). */
const TABS_GAP = 24;
/** Width of the scroll button (32 px chevron) on each edge with hidden tabs. */
const TABS_EDGE = 32;
/** Fade after the button, as wide as the gap between tabs. */
const TABS_FADE = TABS_GAP;
/** Band covered on each edge with hidden tabs: button + fade (`scroll-pl-14`). */
const TABS_INSET = TABS_EDGE + TABS_FADE;
/** Longest tab tail (the counter and a bit more) that the mask hides instead of fading. */
const TABS_TAIL_MAX = 48;

/**
 * Mask of the edges with hidden tabs; the other stays sharp. Under the scroll button (32 px) the
 * tabs are transparent and then fade over 24 px: the button shows over the surface background,
 * without a background of its own. On the left, when a tab is cut right after the button, its tail
 * (up to `TABS_TAIL_MAX`) is transparent too: a tab's counter never shows on its own.
 */
export function tabsFadeMask({ end, start, startTail = 0 }: Overflow): string | undefined {
  if (!start && !end) return undefined;
  const hidden = Math.max(TABS_EDGE, startTail);
  const left = start ? `transparent ${hidden}px, black ${hidden + TABS_FADE}px` : "black";
  const right = end
    ? `black calc(100% - ${TABS_INSET}px), transparent calc(100% - ${TABS_EDGE}px)`
    : "black";
  return `linear-gradient(to right, ${left}, ${right})`;
}

export type TabBox = { left: number; width: number };

/** Tail of the tab cut right after the left button, when it is short enough to hide. */
function leftTail(tabs: ReadonlyArray<HTMLElement>, position: number): number {
  const edge = position + TABS_EDGE;
  for (const tab of tabs) {
    const right = tab.offsetLeft + tab.offsetWidth;
    if (tab.offsetLeft < edge && right > edge) {
      const tail = right - position;
      return tail <= TABS_EDGE + TABS_TAIL_MAX ? Math.ceil(tail) : 0;
    }
  }
  return 0;
}

/**
 * Where the strip should sit to show the active tab with its neighbors whole. The candidate
 * positions are the start, the end of the scroll and the point where each tab starts right after
 * the left button and fade (the same points as the per-tab snap, `scroll-pl-14`). Among those that
 * show the active tab whole outside the covered edges:
 * - if the current position already works, the strip does not move;
 * - prefer one that does not cut a tab right after the left button (never only the counter in view);
 * - then the one that shows the previous whole, then the one that shows the next whole;
 * - on a tie, the closest to the current position.
 */
export function revealScrollLeft({
  activeIndex,
  clientWidth,
  scrollLeft,
  scrollWidth,
  tabs,
}: {
  activeIndex: number;
  clientWidth: number;
  scrollLeft: number;
  scrollWidth: number;
  tabs: ReadonlyArray<TabBox>;
}): number {
  const active = tabs[activeIndex];
  if (active === undefined) return scrollLeft;
  const max = Math.max(0, scrollWidth - clientWidth);
  const clamp = (position: number) => Math.min(max, Math.max(0, position));
  const inView = (tab: TabBox | undefined, position: number) => {
    if (tab === undefined) return false;
    const startInset = position > 1 ? TABS_INSET : 0;
    const endInset = position < max - 1 ? TABS_INSET : 0;
    return (
      tab.left >= position + startInset - 1 &&
      tab.left + tab.width <= position + clientWidth - endInset + 1
    );
  };
  // A tab crosses the left button's edge: only its tail (the counter) would be in view.
  const cutsStart = (position: number) => {
    if (position <= 1) return false;
    const edge = position + TABS_EDGE;
    return tabs.some((tab) => tab.left < edge - 1 && tab.left + tab.width > edge + 1);
  };

  if (inView(active, scrollLeft) && !cutsStart(scrollLeft)) return scrollLeft;

  const candidates = [
    ...new Set([0, max, ...tabs.map((tab) => clamp(tab.left - TABS_INSET))]),
  ].filter((position) => inView(active, position));
  if (candidates.length === 0) return clamp(active.left - TABS_INSET);

  const score = (position: number) =>
    (cutsStart(position) ? 0 : 4) +
    (activeIndex === 0 || inView(tabs[activeIndex - 1], position) ? 2 : 0) +
    (activeIndex === tabs.length - 1 || inView(tabs[activeIndex + 1], position) ? 1 : 0);

  return candidates.reduce((best, position) => {
    const difference = score(position) - score(best);
    if (difference !== 0) return difference > 0 ? position : best;
    return Math.abs(position - scrollLeft) < Math.abs(best - scrollLeft) ? position : best;
  });
}

/**
 * Tab the scroll button brings into view: on the left, the last one not yet whole after the
 * button; on the right, the first one not yet whole before it.
 */
export function stepTabIndex({
  clientWidth,
  direction,
  scrollLeft,
  tabs,
}: {
  clientWidth: number;
  direction: "previous" | "next";
  scrollLeft: number;
  tabs: ReadonlyArray<TabBox>;
}): number {
  if (direction === "previous") {
    for (let index = tabs.length - 1; index >= 0; index -= 1) {
      const tab = tabs[index];
      if (tab !== undefined && tab.left < scrollLeft + TABS_INSET - 1) return index;
    }
    return 0;
  }
  const index = tabs.findIndex(
    (tab) => tab.left + tab.width > scrollLeft + clientWidth - TABS_INSET + 1,
  );
  return index < 0 ? tabs.length - 1 : index;
}

function tabBoxes(list: HTMLElement): { boxes: TabBox[]; elements: HTMLElement[] } {
  const elements = Array.from(list.querySelectorAll<HTMLElement>("[role='tab']"));
  return {
    boxes: elements.map((tab) => ({ left: tab.offsetLeft, width: tab.offsetWidth })),
    elements,
  };
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** 32 px scroll button over the faded edge (the mask leaves the strip transparent there). */
function ScrollButton({
  direction,
  onClick,
}: {
  direction: "previous" | "next";
  onClick: () => void;
}) {
  const Icon = direction === "previous" ? ChevronLeft : ChevronRight;
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-y-0 flex items-center",
        direction === "previous" ? "left-0" : "right-0",
      )}
    >
      <Button
        aria-label={
          direction === "previous" ? "Scroll to the previous tab" : "Scroll to the next tab"
        }
        className="pointer-events-auto text-muted-foreground hover:text-foreground"
        data-tabs-scroll={direction}
        onClick={onClick}
        size="icon-sm"
        // Out of the Tab order: on the keyboard, the arrows move between tabs and the strip follows focus.
        tabIndex={-1}
        type="button"
        variant="ghost"
      >
        <Icon aria-hidden="true" />
      </Button>
    </div>
  );
}

/**
 * Tabs with a counter in a gray pill (zero muted, above zero in main ink and medium weight) and a
 * black underline on the active one. Keyboard and roles come from Base UI (arrows move focus,
 * Enter/Space activates). Panels are <TabPanel value> inside `children`.
 *
 * When they do not fit (phones), the strip scrolls horizontally with a snap right after the covered
 * edge (`scroll-pl-14`) and brings the active tab into view with its neighbors whole (see
 * `revealScrollLeft`). Each edge with hidden tabs shows a 32 px chevron button ("Scroll to the
 * previous/next tab") over a fade (mask, no background); without hidden tabs, no button. The left
 * edge never cuts a tab: a tab's counter never shows on its own.
 */
export function Tabs<T extends string>({
  ariaLabel,
  children,
  className,
  onValueChange,
  options,
  value,
}: {
  ariaLabel: string;
  children: ReactNode;
  className?: string;
  onValueChange: (value: T) => void;
  options: ReadonlyArray<TabOption<T>>;
  value: T;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState<Overflow>({ end: false, start: false });

  const measure = useCallback(() => {
    const list = listRef.current;
    if (list === null) return;
    const max = list.scrollWidth - list.clientWidth;
    const position = list.scrollLeft;
    const start = position > 1;
    const end = position < max - 1;
    const tabs = Array.from(list.querySelectorAll<HTMLElement>("[role='tab']"));
    const startTail = start ? leftTail(tabs, position) : 0;
    setOverflow((current) =>
      current.start === start && current.end === end && (current.startTail ?? 0) === startTail
        ? current
        : { end, start, startTail },
    );
  }, []);

  /** Brings the tab at `index` into view with its neighbors whole. */
  const reveal = useCallback(
    (index: number, smooth: boolean) => {
      const list = listRef.current;
      if (list === null) return;
      const next = revealScrollLeft({
        activeIndex: index,
        clientWidth: list.clientWidth,
        scrollLeft: list.scrollLeft,
        scrollWidth: list.scrollWidth,
        tabs: tabBoxes(list).boxes,
      });
      if (next !== list.scrollLeft) {
        if (smooth && typeof list.scrollTo === "function") {
          list.scrollTo({ behavior: prefersReducedMotion() ? "auto" : "smooth", left: next });
        } else {
          list.scrollLeft = next;
        }
      }
      measure();
    },
    [measure],
  );

  const step = useCallback(
    (direction: "previous" | "next") => {
      const list = listRef.current;
      if (list === null) return;
      reveal(
        stepTabIndex({
          clientWidth: list.clientWidth,
          direction,
          scrollLeft: list.scrollLeft,
          tabs: tabBoxes(list).boxes,
        }),
        true,
      );
    },
    [reveal],
  );

  // Measures again when the strip or a tab changes width (window, counter that arrived).
  useEffect(() => {
    const list = listRef.current;
    if (list === null || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    for (const tab of list.querySelectorAll("[role='tab']")) observer.observe(tab);
    return () => observer.disconnect();
  }, [measure]);

  // The active tab comes into view without scrolling the page vertically (which scrollIntoView would do).
  useEffect(() => {
    const list = listRef.current;
    if (list === null) return;
    const index = tabBoxes(list).elements.findIndex(
      (element) => element.dataset["tabValue"] === value,
    );
    if (index < 0) return;
    reveal(index, false);
  }, [reveal, value]);

  const mask = tabsFadeMask(overflow);

  return (
    <TabsPrimitive.Root
      className={cn("flex flex-col gap-6", className)}
      onValueChange={(next) => {
        const option = options.find((candidate) => candidate.value === next);
        if (option !== undefined) onValueChange(option.value);
      }}
      value={value}
    >
      <div className="relative border-b border-border">
        <TabsPrimitive.List
          aria-label={ariaLabel}
          className="relative flex snap-x snap-proximity scroll-pl-14 [scrollbar-width:none] gap-6 overflow-x-auto overscroll-x-contain [&::-webkit-scrollbar]:hidden"
          data-overflow-end={overflow.end || undefined}
          data-overflow-start={overflow.start || undefined}
          // Arrow-key focus may land on a tab hidden under the button: the strip brings it into view.
          onFocus={(event) => {
            const list = listRef.current;
            if (list === null || !(event.target instanceof HTMLElement)) return;
            const index = tabBoxes(list).elements.indexOf(event.target);
            if (index >= 0) reveal(index, true);
          }}
          onScroll={measure}
          ref={listRef}
          style={mask === undefined ? undefined : { maskImage: mask, WebkitMaskImage: mask }}
        >
          {options.map((option) => {
            const Icon = option.icon;

            return (
              <TabsPrimitive.Tab
                className="group/tab flex h-10 shrink-0 snap-start items-center gap-2 rounded-t-md text-body font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 data-active:text-foreground"
                data-tab-value={option.value}
                key={option.value}
                value={option.value}
              >
                {Icon !== undefined ? (
                  <Icon aria-hidden="true" className="size-4" strokeWidth={1.75} />
                ) : null}
                {option.label}
                {option.count !== undefined ? (
                  <CountPill
                    // Always the neutral gray pill; the number says the weight: zero muted
                    // (secondary ink, normal weight), above zero in main ink and medium weight.
                    className={
                      option.count === 0
                        ? "font-normal text-muted-foreground"
                        : "font-medium text-foreground"
                    }
                    count={option.count}
                    {...(option.countLabel !== undefined ? { label: option.countLabel } : {})}
                  />
                ) : null}
              </TabsPrimitive.Tab>
            );
          })}
          <TabsPrimitive.Indicator className="absolute bottom-0 left-(--active-tab-left) h-0.5 w-(--active-tab-width) rounded-full bg-foreground transition-[left,width] duration-200 ease-out motion-reduce:transition-none" />
        </TabsPrimitive.List>
        {overflow.start ? (
          <ScrollButton direction="previous" onClick={() => step("previous")} />
        ) : null}
        {overflow.end ? <ScrollButton direction="next" onClick={() => step("next")} /> : null}
      </div>
      {children}
    </TabsPrimitive.Root>
  );
}

export function TabPanel({
  children,
  className,
  value,
}: {
  children: ReactNode;
  className?: string;
  value: string;
}) {
  return (
    <TabsPrimitive.Panel className={cn("outline-none", className)} value={value}>
      {children}
    </TabsPrimitive.Panel>
  );
}
