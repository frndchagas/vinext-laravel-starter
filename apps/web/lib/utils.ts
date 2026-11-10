import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * Sizes of the design-system type scale (app/globals.css). Without this registration tailwind-merge
 * reads `text-caption` as a colour and drops it when `text-negative` comes after it.
 */
const TYPE_SCALE = [
  "caption",
  "label",
  "table",
  "body",
  "heading",
  "title",
  "display",
  "kpi",
  "hero",
];

/**
 * Named spacings of the design system (`--spacing-*` in app/globals.css). Without them tailwind-merge
 * does not know that `p-card` is padding or that `gap-stack` is a gap: `cn("p-card", "p-0")` would
 * keep both and `p-card`, generated later in the CSS, would win (double padding on cards). They
 * apply to padding, margin, gap, height, width, `size-*`, `inset` and the like.
 */
const SPACING = ["page", "card", "stack", "row", "control"];

const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      // Named radius and shadow (`rounded-card`, `shadow-card`), so they are not read as colours.
      radius: ["card", "pill"],
      shadow: ["card", "raised", "popover"],
      spacing: SPACING,
      text: TYPE_SCALE,
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
