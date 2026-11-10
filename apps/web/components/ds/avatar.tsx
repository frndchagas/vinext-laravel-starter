import { cn } from "@/lib/utils";

/** Name particles skipped when picking initials ("Maria de Souza" → "MS", "Ludwig van Beethoven" → "LB"). */
const PARTICLES = new Set([
  "da",
  "das",
  "de",
  "del",
  "der",
  "di",
  "do",
  "dos",
  "e",
  "la",
  "van",
  "von",
  "y",
]);

/**
 * Two letters from the first two words that have letters, skipping particles, parentheses and
 * digits: "Maria de Souza Nogueira" → "MS"; "Acme (Holdings)" → "AH"; "52 333 017 John Smith" →
 * "JS". A single word gives its first two letters ("Acme" → "AC").
 */
export function initialsOf(name: string): string {
  const words = name
    .split(/\s+/)
    .map((word) => word.replace(/[^\p{L}]/gu, ""))
    .filter((word) => word !== "" && !PARTICLES.has(word.toLocaleLowerCase("en-US")));
  const [first = "", second] = words;
  const letters = second === undefined ? first.slice(0, 2) : `${first[0] ?? ""}${second[0] ?? ""}`;

  return letters.toLocaleUpperCase("en-US");
}

/** Initials in a gray circle (people, organizations). The full name sits beside it, in text. */
export function Initials({
  className,
  name,
  size = "md",
}: {
  className?: string | undefined;
  name: string;
  size?: "sm" | "md";
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full border border-border bg-muted font-semibold text-muted-foreground",
        size === "sm" ? "size-6 text-[0.625rem]" : "size-8 text-[0.6875rem]",
        className,
      )}
    >
      {initialsOf(name)}
    </span>
  );
}
