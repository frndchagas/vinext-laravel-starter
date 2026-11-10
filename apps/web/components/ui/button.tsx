import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { LoaderCircle } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const buttonCva = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:shadow-none aria-disabled:active:not-aria-[haspopup]:translate-y-0 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-card hover:bg-primary/88 aria-disabled:hover:bg-primary",
        outline:
          "border-border-strong bg-card shadow-card hover:bg-muted hover:text-foreground aria-disabled:hover:bg-card aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50 dark:aria-disabled:hover:bg-input/30",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-disabled:hover:bg-transparent aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50 dark:aria-disabled:hover:bg-transparent",
        // Outlined like the secondary: red lives in the text only (no tinted background).
        destructive:
          "border-border-strong bg-card text-destructive shadow-card hover:bg-muted focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:border-input dark:bg-input/30 dark:hover:bg-input/50 dark:focus-visible:ring-destructive/40",
        link: "text-primary underline decoration-border-strong underline-offset-4 hover:decoration-current",
      },
      size: {
        default:
          "h-control gap-1.5 px-3 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        icon: "size-control",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-8 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

/**
 * Button classes already resolved by tailwind-merge. Without this, a <Link> with
 * `buttonVariants({ variant: "outline" })` carried both `border-transparent` and
 * `border-border-strong`, and the CSS order left the border transparent in the light theme: the link
 * looked like another kind of button next to a <Button> of the same variant.
 */
function buttonVariants(props?: Parameters<typeof buttonCva>[0]): string {
  return cn(buttonCva(props));
}

/**
 * `pending`: the click's action is under way (mutation, submit, download). The button locks at once,
 * without waiting for the response, so a second click cannot repeat the request: it is off but still
 * focusable (`aria-disabled`, focus does not jump to the page body), with `aria-busy`, a wait cursor
 * and a spinner in place of the icon (the button's own icon hides while it spins; on an icon-only
 * button the spinner takes its place). `pendingLabel` swaps the text ("Saving…"); without it the text
 * stays. With `prefers-reduced-motion` the spinner stands still. See "Loading and pending" in
 * docs/design-system.md.
 */
function Button({
  children,
  className,
  disabled,
  focusableWhenDisabled,
  pending = false,
  pendingLabel,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props &
  VariantProps<typeof buttonCva> & {
    pending?: boolean;
    pendingLabel?: ReactNode;
  }) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={buttonVariants({
        variant,
        size,
        className: cn(
          pending && "cursor-progress! opacity-80! [&_svg:not([data-pending-spinner])]:hidden",
          className,
        ),
      })}
      {...props}
      {...(pending ? { "aria-busy": true, "data-pending": "" } : {})}
      disabled={pending || disabled === true}
      {...(focusableWhenDisabled !== undefined || pending
        ? { focusableWhenDisabled: focusableWhenDisabled ?? true }
        : {})}
    >
      {pending ? (
        <>
          <LoaderCircle
            aria-hidden="true"
            className="animate-spin motion-reduce:animate-none"
            data-icon="inline-start"
            data-pending-spinner=""
          />
          {pendingLabel ?? children}
        </>
      ) : (
        children
      )}
    </ButtonPrimitive>
  );
}

export { Button, buttonVariants };
