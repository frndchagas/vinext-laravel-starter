import type { LucideIcon } from "lucide-react";
import { useId, type ComponentProps, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Icon in a small white square with a border: opens card headers and empty states.
 * `tone="ai"` paints only the icon violet (the square stays white).
 */
export function IconTile({
  className,
  icon: Icon,
  size = "md",
  tone = "neutral",
}: {
  className?: string | undefined;
  icon: LucideIcon;
  size?: "sm" | "md";
  tone?: "neutral" | "ai";
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-[0.625rem] border",
        size === "sm" ? "size-7" : "size-8",
        "border-border-strong bg-card shadow-card",
        tone === "neutral" ? "text-foreground" : "text-ai-ink",
        className,
      )}
    >
      <Icon className={size === "sm" ? "size-3.5" : "size-4"} strokeWidth={1.75} />
    </span>
  );
}

/** White card, 1 px light border, 16 px radius and an almost invisible shadow. */
export function Card({ className, ...props }: ComponentProps<"section">) {
  return (
    <section
      className={cn(
        "flex min-w-0 flex-col gap-stack rounded-card border border-border bg-card p-card text-card-foreground shadow-card",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Card header: icon, title (h2 by default), short description and actions on the right.
 * Use inside `<Card aria-labelledby={id}>` passing the same `id`.
 */
export function CardHeader({
  actions,
  className,
  description,
  headingLevel = 2,
  icon,
  iconTone,
  id,
  title,
  wrap = false,
}: {
  actions?: ReactNode;
  className?: string | undefined;
  description?: ReactNode;
  headingLevel?: 2 | 3;
  icon?: LucideIcon | undefined;
  iconTone?: "neutral" | "ai" | undefined;
  id?: string | undefined;
  title: ReactNode;
  /** Wrap title and description onto several lines instead of truncating (titles with fact + date). */
  wrap?: boolean;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const overflow = wrap ? "text-pretty" : "truncate";

  return (
    <header className={cn("flex flex-wrap items-center gap-3", className)}>
      {icon !== undefined ? <IconTile icon={icon} tone={iconTone ?? "neutral"} /> : null}
      <div className="min-w-40 flex-1">
        <Heading className={cn(overflow, "text-heading")} id={id}>
          {title}
        </Heading>
        {description !== undefined ? (
          <p className={cn(overflow, "text-label text-muted-foreground")}>{description}</p>
        ) : null}
      </div>
      {actions !== undefined ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}

/** Shortcut for the common case: card with header and content, already linked by aria-labelledby. */
export function TitledCard({
  actions,
  children,
  className,
  description,
  icon,
  iconTone,
  id,
  title,
  wrap = false,
}: {
  actions?: ReactNode;
  children: ReactNode;
  className?: string | undefined;
  description?: ReactNode;
  icon?: LucideIcon | undefined;
  iconTone?: "neutral" | "ai" | undefined;
  /** Anchor of the card (`#sessions`), so a link on the same page can lead to it. */
  id?: string | undefined;
  /** Text or a link (the title that leads to the same filtered list). */
  title: ReactNode;
  /** Wrap title and description instead of truncating (see `CardHeader`). */
  wrap?: boolean;
}) {
  const headingId = useId();

  return (
    <Card aria-labelledby={headingId} className={className} id={id}>
      <CardHeader
        actions={actions}
        description={description}
        icon={icon}
        iconTone={iconTone}
        id={headingId}
        title={title}
        wrap={wrap}
      />
      {children}
    </Card>
  );
}
