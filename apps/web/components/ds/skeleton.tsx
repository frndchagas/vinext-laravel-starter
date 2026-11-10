import { cn } from "@/lib/utils";

/** Loading block. Decorative: whoever loads announces the state (aria-busy or an <output>). */
export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "block animate-pulse rounded-md bg-muted motion-reduce:animate-none",
        className,
      )}
    />
  );
}
