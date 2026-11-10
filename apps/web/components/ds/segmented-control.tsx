"use client";

import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * `icon` (decorative, `aria-hidden`) goes before the label, for example the ✦ of "✦ Answer" in an
 * origin filter; the accessible name stays the label.
 */
export type SegmentOption<T extends string> = {
  icon?: ReactNode;
  label: string;
  short?: string;
  value: T;
};

/**
 * Single choice between a few neighboring options (period, view). Radiogroup semantics: Tab enters
 * the group, arrows switch the option. `short` replaces `label` on phones. On phones each option is
 * 36 px tall (touch target); from `sm`, 28 px.
 */
export function SegmentedControl<T extends string>({
  ariaLabel,
  className,
  onValueChange,
  options,
  value,
}: {
  ariaLabel: string;
  className?: string;
  onValueChange: (value: T) => void;
  options: ReadonlyArray<SegmentOption<T>>;
  value: T;
}) {
  return (
    <RadioGroup
      aria-label={ariaLabel}
      className={cn(
        "inline-flex max-w-full [scrollbar-width:none] gap-0.5 overflow-x-auto rounded-[0.625rem] border border-border-strong bg-muted p-0.5",
        className,
      )}
      onValueChange={(next) => {
        const option = options.find((candidate) => candidate.value === next);
        if (option !== undefined) onValueChange(option.value);
      }}
      value={value}
    >
      {options.map((option) => (
        <Radio.Root
          className="relative inline-flex h-9 shrink-0 items-center gap-1 rounded-md px-3 text-label font-medium text-muted-foreground outline-none before:absolute before:inset-x-0 before:-inset-y-0.5 before:content-[''] hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 sm:h-7 data-checked:bg-card data-checked:text-foreground data-checked:shadow-raised"
          key={option.value}
          value={option.value}
        >
          {option.icon}
          {option.short !== undefined ? (
            <>
              <span className="sm:hidden">{option.short}</span>
              <span className="hidden sm:inline">{option.label}</span>
            </>
          ) : (
            option.label
          )}
        </Radio.Root>
      ))}
    </RadioGroup>
  );
}
