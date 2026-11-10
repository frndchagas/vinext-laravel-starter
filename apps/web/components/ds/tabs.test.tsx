import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  revealScrollLeft,
  stepTabIndex,
  TabPanel,
  Tabs,
  tabsFadeMask,
  type TabOption,
} from "./tabs";

type Topic = "one" | "two" | "three";

const OPTIONS: TabOption<Topic>[] = [
  { value: "one", label: "Classification", count: 3, countLabel: "questions" },
  { value: "two", label: "Ambiguous counterparty", count: 0, countLabel: "pending items" },
  { value: "three", label: "Filed automatically" },
];

function Harness() {
  const [value, setValue] = useState<Topic>("one");
  return (
    <Tabs ariaLabel="Topics" onValueChange={setValue} options={OPTIONS} value={value}>
      <TabPanel value="one">Panel one</TabPanel>
      <TabPanel value="two">Panel two</TabPanel>
      <TabPanel value="three">Panel three</TabPanel>
    </Tabs>
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("tabsFadeMask", () => {
  it("makes the button band (32 px) transparent and fades 24 px, only on edges with hidden tabs", () => {
    expect(tabsFadeMask({ end: false, start: false })).toBeUndefined();
    expect(tabsFadeMask({ end: true, start: false })).toBe(
      "linear-gradient(to right, black, black calc(100% - 56px), transparent calc(100% - 32px))",
    );
    expect(tabsFadeMask({ end: false, start: true })).toBe(
      "linear-gradient(to right, transparent 32px, black 56px, black)",
    );
    expect(tabsFadeMask({ end: true, start: true })).toBe(
      "linear-gradient(to right, transparent 32px, black 56px, black calc(100% - 56px), transparent calc(100% - 32px))",
    );
  });

  it("hides the whole tail of a tab cut right after the left button", () => {
    expect(tabsFadeMask({ end: false, start: true, startTail: 12 })).toBe(
      "linear-gradient(to right, transparent 32px, black 56px, black)",
    );
    expect(tabsFadeMask({ end: false, start: true, startTail: 60 })).toBe(
      "linear-gradient(to right, transparent 60px, black 84px, black)",
    );
  });
});

describe("revealScrollLeft", () => {
  // 316 px strip on a 390 px phone: Classification (140 px), Data gap (149 px), Attention (107 px),
  // with a 24 px gap; 444 px of tabs, end of scroll at 128 px.
  const tabs = [
    { left: 0, width: 140 },
    { left: 164, width: 149 },
    { left: 337, width: 107 },
  ];
  const strip = { clientWidth: 316, scrollLeft: 0, scrollWidth: 444, tabs };

  it("does not move the strip when the active tab is already in view", () => {
    expect(revealScrollLeft({ ...strip, activeIndex: 0 })).toBe(0);
  });

  it("brings the active tab with the next neighbor whole when the previous does not fit", () => {
    // Previous and active together (313 px) do not fit with the covered edges: the second starts
    // right after the button and the fade (56 px), and the first ends under the button.
    expect(revealScrollLeft({ ...strip, activeIndex: 1 })).toBe(108);
  });

  it("stops with the tab right after the covered edge, without cutting another after the button", () => {
    // Six 100 px tabs with a 24 px gap; 358 px strip.
    const many = Array.from({ length: 6 }, (_, index) => ({ left: index * 124, width: 100 }));
    const next = revealScrollLeft({
      activeIndex: 3,
      clientWidth: 358,
      scrollLeft: 0,
      scrollWidth: 720,
      tabs: many,
    });
    // The previous (248 px) starts 56 px after the edge (32 px button + fade): the tab before it
    // ends under the button, nothing cut in view.
    expect(next).toBe(192);
    const edge = next + 32;
    expect(many.some((tab) => tab.left < edge && tab.left + tab.width > edge)).toBe(false);
  });

  it("does not pass the end of the scroll and leaves a position that shows only a tab's tail", () => {
    const many = Array.from({ length: 6 }, (_, index) => ({ left: index * 124, width: 100 }));
    const base = { clientWidth: 358, scrollWidth: 720, tabs: many };
    expect(revealScrollLeft({ ...base, activeIndex: 5, scrollLeft: 0 })).toBe(362);
    // At 80 px the left button cuts the first tab (only the tail is left): the strip goes back
    // to the start, with the previous whole.
    expect(revealScrollLeft({ ...base, activeIndex: 1, scrollLeft: 80 })).toBe(0);
  });
});

describe("Tabs", () => {
  it("keeps tab roles and the keyboard's roving focus", () => {
    render(<Harness />);

    const list = screen.getByRole("tablist", { name: "Topics" });
    const first = screen.getByRole("tab", { name: /Classification/ });
    expect(list).not.toHaveAttribute("data-overflow-end");
    expect(list).not.toHaveAttribute("style");
    expect(first).toHaveAttribute("aria-selected", "true");

    // Only the active tab is in the Tab order; the arrows (Base UI) move between the others.
    const second = screen.getByRole("tab", { name: /Ambiguous counterparty/ });
    expect(first).toHaveAttribute("tabindex", "0");
    expect(second).toHaveAttribute("tabindex", "-1");

    fireEvent.click(second);
    expect(second).toHaveAttribute("aria-selected", "true");
    expect(second).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Panel two");
  });

  it("mutes the zero counter and gives weight to the one above zero, in the same gray pill", () => {
    render(<Harness />);

    const filled = screen.getByText("3").closest("span");
    const empty = screen.getByText("0").closest("span");
    expect(filled).toHaveClass("bg-pill", "text-foreground", "font-medium");
    expect(filled).not.toHaveClass("font-semibold", "text-muted-foreground");
    expect(empty).toHaveClass("bg-pill", "text-muted-foreground", "font-normal");
    expect(empty).not.toHaveClass("font-semibold", "text-foreground");
  });

  it("scrolls when the tabs do not fit and fades the edge with hidden tabs", () => {
    vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(600);
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(358);
    render(<Harness />);

    const list = screen.getByRole("tablist", { name: "Topics" });
    expect(list).toHaveClass("overflow-x-auto");
    expect(list).toHaveAttribute("data-overflow-end", "true");
    expect(list).not.toHaveAttribute("data-overflow-start");

    list.scrollLeft = 242;
    fireEvent.scroll(list);
    expect(list).toHaveAttribute("data-overflow-start", "true");
    expect(list).not.toHaveAttribute("data-overflow-end");
  });

  it("opens with the previous tab whole in view when the active one is out of view", () => {
    vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(900);
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(358);
    vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(100);
    const lefts: Record<string, number> = { one: 0, three: 424, two: 300 };
    vi.spyOn(HTMLElement.prototype, "offsetLeft", "get").mockImplementation(function (
      this: HTMLElement,
    ) {
      return lefts[this.dataset["tabValue"] ?? ""] ?? 0;
    });

    render(
      <Tabs ariaLabel="Topics" onValueChange={() => undefined} options={OPTIONS} value="three">
        <TabPanel value="three">Panel three</TabPanel>
      </Tabs>,
    );

    const list = screen.getByRole("tablist", { name: "Topics" });
    // The previous ("two") starts at 300 px: the strip stops 56 px before it (button + fade), and
    // the first (0 to 100 px) is fully out of view, no loose tail after the button.
    expect(list.scrollLeft).toBe(244);
    expect(list).toHaveClass("scroll-pl-14");
    expect(list).toHaveAttribute("data-overflow-start", "true");
    expect(list).toHaveAttribute("data-overflow-end", "true");
    expect(screen.getByRole("button", { name: "Scroll to the previous tab" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Scroll to the next tab" })).toBeInTheDocument();
  });

  it("shows no scroll buttons when every tab fits", () => {
    render(<Harness />);
    expect(screen.queryByRole("button", { name: /Scroll to/ })).not.toBeInTheDocument();
  });

  it("shows the chevron only on the edge with hidden tabs and scrolls to the next or previous tab", () => {
    vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(900);
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(358);
    vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(100);
    const lefts: Record<string, number> = { one: 0, three: 424, two: 300 };
    vi.spyOn(HTMLElement.prototype, "offsetLeft", "get").mockImplementation(function (
      this: HTMLElement,
    ) {
      return lefts[this.dataset["tabValue"] ?? ""] ?? 0;
    });
    const scrollTo = vi.fn<(this: HTMLElement, options: ScrollToOptions) => void>(function (
      this: HTMLElement,
      options: ScrollToOptions,
    ) {
      this.scrollLeft = options.left ?? 0;
    });
    const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollTo");
    Object.defineProperty(HTMLElement.prototype, "scrollTo", {
      configurable: true,
      value: scrollTo,
    });

    try {
      render(<Harness />);
      const list = screen.getByRole("tablist", { name: "Topics" });

      // At the start, only the right has hidden tabs.
      expect(screen.queryByRole("button", { name: "Scroll to the previous tab" })).toBeNull();
      const next = screen.getByRole("button", { name: "Scroll to the next tab" });
      expect(next).toHaveAttribute("tabindex", "-1");

      // "two" (300 to 400 px) passes the right covered edge: the strip brings it in whole.
      fireEvent.click(next);
      expect(scrollTo).toHaveBeenLastCalledWith(expect.objectContaining({ left: 244 }));
      fireEvent.scroll(list);
      const previous = screen.getByRole("button", { name: "Scroll to the previous tab" });

      // "one" is now hidden on the left: the left chevron goes back to the start.
      fireEvent.click(previous);
      expect(scrollTo).toHaveBeenLastCalledWith(expect.objectContaining({ left: 0 }));
      fireEvent.scroll(list);
      expect(screen.queryByRole("button", { name: "Scroll to the previous tab" })).toBeNull();
      // The buttons only scroll: the active tab stays the same.
      expect(screen.getByRole("tab", { name: /Classification/ })).toHaveAttribute(
        "aria-selected",
        "true",
      );
    } finally {
      if (original === undefined) {
        Reflect.deleteProperty(HTMLElement.prototype, "scrollTo");
      } else {
        Object.defineProperty(HTMLElement.prototype, "scrollTo", original);
      }
    }
  });
});

describe("stepTabIndex", () => {
  const tabs = [
    { left: 0, width: 100 },
    { left: 124, width: 100 },
    { left: 248, width: 100 },
    { left: 372, width: 100 },
  ];

  it("picks the last tab still hidden under the left edge and the first under the right", () => {
    // At 150 px, the left covered edge reaches 206 px and the right one starts at 302 px.
    const strip = { clientWidth: 208, scrollLeft: 150, tabs };
    expect(stepTabIndex({ ...strip, direction: "previous" })).toBe(1);
    expect(stepTabIndex({ ...strip, direction: "next" })).toBe(2);
  });
});
