import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Card of one Settings section: title, description and status (pill) on the left, in a 256 px
 * column; fields and actions on the right. On the phone (below `md`) the two blocks stack, title
 * first.
 */
export function SettingsSection({
  children,
  className,
  description,
  headingId,
  status,
  title,
}: {
  children: ReactNode;
  className?: string;
  description?: ReactNode;
  headingId: string;
  /** Section status ("Active", "Disabled"), in a gray pill under the description. */
  status?: ReactNode;
  title: string;
}) {
  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        "flex flex-col gap-4 rounded-card border border-border bg-card p-card shadow-card md:flex-row md:gap-8",
        className,
      )}
      data-settings-section=""
    >
      <div className="flex flex-col gap-1 md:w-64 md:shrink-0" data-settings-aside="">
        <h2 className="text-heading text-balance" id={headingId}>
          {title}
        </h2>
        {description !== undefined ? (
          <p className="text-body text-pretty text-muted-foreground">{description}</p>
        ) : null}
        {status !== undefined ? <div className="mt-2">{status}</div> : null}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-4" data-settings-fields="">
        {children}
      </div>
    </section>
  );
}
