import { describe, expect, it } from "vitest";

import { cn } from "./utils";

describe("cn", () => {
  it("keeps the design-system font size when a text colour comes after it", () => {
    expect(cn("text-caption", "text-negative")).toBe("text-caption text-negative");
    expect(cn("text-body text-muted-foreground")).toBe("text-body text-muted-foreground");
  });

  it("still resolves conflicts between two font sizes", () => {
    expect(cn("text-caption", "text-label")).toBe("text-label");
  });

  it("lets a card override the design-system padding and gap", () => {
    const card = "flex flex-col gap-stack rounded-card bg-card p-card shadow-card";

    expect(cn(card, "p-0")).toBe("flex flex-col gap-stack rounded-card bg-card shadow-card p-0");
    expect(cn(card, "p-0 max-sm:px-0")).toBe(
      "flex flex-col gap-stack rounded-card bg-card shadow-card p-0 max-sm:px-0",
    );
    expect(cn(card, "p-2 sm:p-3")).toBe(
      "flex flex-col gap-stack rounded-card bg-card shadow-card p-2 sm:p-3",
    );
    expect(cn(card, "gap-0")).toBe("flex flex-col rounded-card bg-card p-card shadow-card gap-0");
    // One side alone does not erase the padding of the other sides.
    expect(cn("p-card", "px-0")).toBe("p-card px-0");
    expect(cn("px-0", "p-card")).toBe("p-card");
  });

  it("resolves every named spacing token against plain values", () => {
    expect(cn("px-page", "px-4")).toBe("px-4");
    expect(cn("-mx-card", "mx-0")).toBe("mx-0");
    expect(cn("mb-card", "mb-2")).toBe("mb-2");
    expect(cn("gap-stack", "gap-3")).toBe("gap-3");
    expect(cn("h-control", "h-8")).toBe("h-8");
    expect(cn("h-row", "h-auto")).toBe("h-auto");
    expect(cn("size-control", "size-7")).toBe("size-7");
    expect(cn("min-h-control", "min-h-0")).toBe("min-h-0");
  });

  it("knows the radius and shadow tokens are not colours", () => {
    expect(cn("rounded-card", "rounded-none")).toBe("rounded-none");
    expect(cn("shadow-card", "shadow-none")).toBe("shadow-none");
    // The background colour and the padding of the same name coexist.
    expect(cn("bg-card", "p-card")).toBe("bg-card p-card");
  });
});
