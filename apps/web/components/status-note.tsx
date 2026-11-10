import { AlertTriangle, CircleAlert, CircleCheck, Info } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const STATUS = {
  critical: { color: "var(--status-critical)", Icon: CircleAlert },
  good: { color: "var(--status-good)", Icon: CircleCheck },
  info: { color: "var(--chart-muted)", Icon: Info },
  warning: { color: "var(--status-warning)", Icon: AlertTriangle },
} as const;

/** State with icon + text: the color never carries the meaning on its own. */
export function StatusNote({
  children,
  className,
  status,
}: {
  children: ReactNode;
  className?: string;
  status: keyof typeof STATUS;
}) {
  const { color, Icon } = STATUS[status];

  return (
    <p className={cn("flex items-start gap-1.5 text-sm", className)}>
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" style={{ color }} />
      <span>{children}</span>
    </p>
  );
}
