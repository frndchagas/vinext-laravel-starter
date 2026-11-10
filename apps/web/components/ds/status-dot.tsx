import { CircleCheck } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type DotTone = "negative" | "attention" | "positive" | "neutral" | "ai";

const DOTS = {
  ai: "bg-ai-mark",
  attention: "bg-attention-mark",
  negative: "bg-negative",
  neutral: "bg-subtle-foreground",
} as const satisfies Record<Exclude<DotTone, "positive">, string>;

/**
 * Discreet state in lists: colored dot plus text ("● Overdue"). The text carries the meaning.
 * `tone="positive"` ("On time", "Settled", "Done") takes the neutral gray check in place of the
 * dot: green is reserved for positive numbers.
 */
export function StatusDot({
  children,
  className,
  tone,
  wrap = false,
}: {
  children: ReactNode;
  className?: string;
  tone: DotTone;
  /**
   * Long sentence that may wrap ("Another $28,400 overdue from before November…"): the text wraps
   * inside the width and the dot stays centered on the first line.
   */
  wrap?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex gap-1.5 text-label text-foreground",
        wrap ? "items-start text-pretty" : "items-center whitespace-nowrap",
        className,
      )}
    >
      {tone === "positive" ? (
        <CircleCheck
          aria-hidden="true"
          className={cn(
            "size-3 shrink-0 text-muted-foreground",
            // Center of the first line: half a line height minus half the icon.
            wrap && "mt-[calc(0.5lh-0.375rem)]",
          )}
          data-slot="status-check"
          strokeWidth={2}
        />
      ) : (
        <span
          aria-hidden="true"
          className={cn(
            "size-1.5 shrink-0 rounded-full",
            // Center of the first line: half a line height minus half the dot.
            wrap && "mt-[calc(0.5lh-0.1875rem)]",
            DOTS[tone],
          )}
        />
      )}
      {children}
    </span>
  );
}
