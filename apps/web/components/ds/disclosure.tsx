import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Block that opens and closes with a Lucide chevron, the look of "Show calculation" in `AlertCard`:
 * muted label with an arrow that rotates 90° when open, and content under a thin divider. Uses the
 * native `<details>` (keyboard and screen reader without JS), without the browser's ▶ marker.
 * For calculations, guides and secondary settings.
 */
export function Disclosure({
  children,
  className,
  contentClassName,
  defaultOpen,
  label,
  onToggle,
}: {
  children: ReactNode;
  className?: string | undefined;
  contentClassName?: string | undefined;
  defaultOpen?: boolean;
  label: ReactNode;
  /** Fires when it opens or closes (for example to load the content only when open). */
  onToggle?: ((open: boolean) => void) | undefined;
}) {
  return (
    <details
      className={cn("group/disclosure text-label", className)}
      onToggle={onToggle === undefined ? undefined : (event) => onToggle(event.currentTarget.open)}
      open={defaultOpen}
    >
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-md text-label font-medium text-muted-foreground outline-none select-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
        <ChevronRight
          aria-hidden="true"
          className="size-3.5 transition-transform duration-150 group-open/disclosure:rotate-90 motion-reduce:transition-none"
        />
        {label}
      </summary>
      <div className={cn("mt-2 border-t border-border pt-2", contentClassName)}>{children}</div>
    </details>
  );
}
