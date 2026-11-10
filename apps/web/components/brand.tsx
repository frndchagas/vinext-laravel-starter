import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Neutral product mark: a rounded tile in the foreground colour with a four-point spark cut out of
 * it. It follows the theme (ink on light, paper on dark) and carries no product-specific colour, so a
 * fork can swap it for its own logo without touching the layout around it.
 */
export function BrandMark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      aria-hidden={title === undefined ? true : undefined}
      className={cn("shrink-0", className)}
      fill="none"
      role={title === undefined ? undefined : "img"}
      viewBox="0 0 32 32"
    >
      {title !== undefined ? <title>{title}</title> : null}
      <rect fill="currentColor" height="32" rx="8" width="32" />
      <path
        d="M16 7c.6 4.6 3.4 7.4 9 9-5.6 1.6-8.4 4.4-9 9-.6-4.6-3.4-7.4-9-9 5.6-1.6 8.4-4.4 9-9Z"
        fill="var(--background)"
      />
    </svg>
  );
}

/**
 * Mark plus the product name from `lib/site-config.ts`, as a link. The name travels as a prop because
 * the config reads `process.env` on the server; client components receive it from their layout.
 */
export function Wordmark({
  children,
  className,
  href = "/",
  name,
}: {
  /** Trailing content (a pending indicator, for instance). */
  children?: ReactNode;
  className?: string;
  href?: string;
  name: string;
}) {
  return (
    <Link
      aria-label={`${name}: go to the start`}
      className={cn(
        "flex items-center gap-2 rounded-lg text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        className,
      )}
      href={href}
    >
      <BrandMark className="size-6" />
      <span className="truncate text-[1.0625rem] font-semibold tracking-[-0.015em]">{name}</span>
      {children}
    </Link>
  );
}
