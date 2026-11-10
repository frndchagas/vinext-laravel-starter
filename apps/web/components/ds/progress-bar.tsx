import { cn } from "@/lib/utils";

/**
 * Thin progress bar for a goal (received vs expected, done vs total). Gray track and neutral ink
 * fill; color only enters the number beside it, never the bar. `label` is the accessible name
 * ("Received in November") and `valueText` spells the progress out ("$25,600 of $61,000").
 * The bar stops at 100%.
 */
export function ProgressBar({
  className,
  done,
  label,
  total,
  valueText,
}: {
  className?: string;
  done: number;
  label: string;
  total: number;
  valueText: string;
}) {
  const ratio = total > 0 ? Math.min(Math.max(done / total, 0), 1) : 0;
  const percent = Math.round(ratio * 100);

  return (
    <progress
      aria-label={label}
      aria-valuetext={valueText}
      className={cn(
        "block h-1.5 w-full appearance-none overflow-hidden rounded-full bg-muted [&::-moz-progress-bar]:rounded-full [&::-moz-progress-bar]:bg-foreground/80 [&::-webkit-progress-bar]:bg-muted [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-foreground/80",
        className,
      )}
      max={100}
      value={percent}
    />
  );
}
