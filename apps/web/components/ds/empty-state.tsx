import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { IconTile } from "./card";

/** Empty is an invitation to act: say what is missing and offer the action that fixes it. */
export function EmptyState({
  action,
  className,
  description,
  icon,
  title,
}: {
  action?: ReactNode;
  className?: string;
  description?: ReactNode;
  icon: LucideIcon;
  title: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-card border border-dashed border-border-strong px-6 py-10 text-center",
        className,
      )}
    >
      <IconTile icon={icon} />
      <div className="max-w-sm">
        <p className="text-heading">{title}</p>
        {description !== undefined ? (
          <p className="mt-1 text-body text-pretty text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
