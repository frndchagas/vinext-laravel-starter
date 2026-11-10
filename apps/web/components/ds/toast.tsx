"use client";

import type { LucideIcon } from "lucide-react";
import { Sparkles, X } from "lucide-react";
import { type CSSProperties, useCallback, useEffect, useRef } from "react";
import {
  type DefaultToastOptions,
  type Renderable,
  type Toast,
  ToastBar,
  type ToastOptions,
  toast as hotToast,
  useToaster,
  type ValueOrFunction,
} from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Design-system toast: the look of react-hot-toast/solid-toast (compact white card at the top,
 * below the sticky header on phones, animated icons, spring entry, scale exit, a stack that
 * reorders) with the design-system tokens.
 * The rest of the app imports `Toaster` and `toast` only from here. When to use: docs/design-system.md, "Toast".
 */

/** Default durations (ms). Loading stays until `toast.promise` resolves or a `toast.dismiss`. */
export const TOAST_DURATIONS = {
  action: 6000,
  error: 5000,
  success: 3000,
  text: 4000,
} as const;

const GUTTER = 8;
/** Drag distance (px) or velocity (px/ms) that dismisses the toast. */
const SWIPE_DISTANCE = 45;
const SWIPE_VELOCITY = 0.11;

// goober injects the ToastBar base outside @layer, and it would win over Tailwind utilities:
// color, border, radius, shadow and padding of the card go inline, with the design-system tokens.
const CARD_STYLE = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius)",
  // The react-hot-toast/solid-toast shadow, in the design-system ink.
  boxShadow: "0 3px 10px rgb(24 24 27 / 10%), 0 3px 3px rgb(24 24 27 / 5%)",
  color: "var(--foreground)",
  fontSize: "var(--text-body)",
  lineHeight: "var(--text-body--line-height)",
  maxWidth: "min(30rem, calc(100vw - 2rem))",
  padding: "6px 10px",
} as const satisfies CSSProperties;

const TOAST_OPTIONS: DefaultToastOptions = {
  style: CARD_STYLE,
  duration: TOAST_DURATIONS.text,
  error: {
    ariaProps: { "aria-live": "assertive", role: "alert" },
    duration: TOAST_DURATIONS.error,
    iconTheme: { primary: "var(--negative)", secondary: "var(--card)" },
  },
  loading: {
    iconTheme: { primary: "var(--foreground)", secondary: "var(--border-strong)" },
  },
  success: {
    duration: TOAST_DURATIONS.success,
    iconTheme: { primary: "var(--positive)", secondary: "var(--card)" },
  },
};

/** Toast container (a single one, in the root layout). Pauses on hover or focus inside; Alt+T focuses. */
export function Toaster() {
  const { handlers, toasts } = useToaster(TOAST_OPTIONS);
  const { calculateOffset, endPause, startPause, updateHeight } = handlers;
  const regionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!event.altKey || event.code !== "KeyT") return;
      const first = regionRef.current?.querySelector<HTMLElement>("button, [tabindex='0']");
      if (first === undefined || first === null) return;
      event.preventDefault();
      first.focus();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Pauses while the mouse is over a toast or keyboard focus is inside one.
  useEffect(() => {
    const region = regionRef.current;
    if (region === null) return undefined;
    function onFocusOut(event: FocusEvent) {
      if (!(event.relatedTarget instanceof Node) || !region?.contains(event.relatedTarget)) {
        endPause();
      }
    }
    region.addEventListener("mouseenter", startPause);
    region.addEventListener("mouseleave", endPause);
    region.addEventListener("focusin", startPause);
    region.addEventListener("focusout", onFocusOut);
    return () => {
      region.removeEventListener("mouseenter", startPause);
      region.removeEventListener("mouseleave", endPause);
      region.removeEventListener("focusin", startPause);
      region.removeEventListener("focusout", onFocusOut);
    };
  }, [endPause, startPause]);

  return (
    // 16 px from the edges. Below `lg` the app has a 57 px sticky header (logo and "Menu"): the
    // stack starts right below it (64 px), without covering the logo or the Menu button.
    <section
      aria-label="Notifications (Alt+T)"
      className="pointer-events-none fixed inset-4 z-[9999] max-lg:top-16"
      data-slot="toaster"
      ref={regionRef}
    >
      {toasts.map((item) => (
        <ToastSlot
          key={item.id}
          offset={calculateOffset(item, { gutter: GUTTER, reverseOrder: false })}
          onHeightUpdate={updateHeight}
          toast={item}
        />
      ))}
    </section>
  );
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Position in the stack (same transition as react-hot-toast) + swipe to dismiss + Esc. */
function ToastSlot({
  offset,
  onHeightUpdate,
  toast: item,
}: {
  offset: number;
  onHeightUpdate: (id: string, height: number) => void;
  toast: Toast;
}) {
  const swipeRef = useRef<HTMLDivElement>(null);
  const toastId = item.id;

  const measure = useCallback(
    (node: HTMLDivElement | null) => {
      if (node === null) return undefined;
      const update = () => onHeightUpdate(toastId, node.getBoundingClientRect().height);
      update();
      const observer = new MutationObserver(update);
      observer.observe(node, { characterData: true, childList: true, subtree: true });
      return () => observer.disconnect();
    },
    [toastId, onHeightUpdate],
  );

  // Native listeners on the card: the wrapper is not a control, the buttons inside it are.
  useEffect(() => {
    const node = swipeRef.current;
    if (node === null) return undefined;
    let drag: { id: number; t: number; x: number; y: number } | null = null;

    function moveTo(x: number, y: number, settle: boolean) {
      if (node === null) return;
      node.style.transition = settle ? "transform 200ms cubic-bezier(.21,1.02,.73,1)" : "none";
      node.style.transform = x === 0 && y === 0 ? "" : `translate3d(${x}px, ${y}px, 0)`;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") hotToast.dismiss(toastId);
    }

    function onPointerDown(event: PointerEvent) {
      const target = event.target;
      if (
        event.button !== 0 ||
        (target instanceof Element && target.closest("button, a") !== null)
      ) {
        return;
      }
      drag = { id: event.pointerId, t: event.timeStamp, x: event.clientX, y: event.clientY };
      node?.setPointerCapture(event.pointerId);
    }

    function onPointerMove(event: PointerEvent) {
      if (drag === null || drag.id !== event.pointerId) return;
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      // Up and sideways free; down resists (the toast lives at the top).
      if (Math.abs(dx) > Math.abs(dy)) moveTo(dx, 0, false);
      else moveTo(0, dy < 0 ? dy : dy * 0.15, false);
    }

    function onPointerEnd(event: PointerEvent) {
      if (node === null || drag === null || drag.id !== event.pointerId) return;
      const dx = event.clientX - drag.x;
      const dy = Math.min(event.clientY - drag.y, 0);
      const distance = Math.max(Math.abs(dx), Math.abs(dy));
      const velocity = distance / Math.max(event.timeStamp - drag.t, 1);
      drag = null;
      if (distance < SWIPE_DISTANCE && velocity < SWIPE_VELOCITY) {
        moveTo(0, 0, true);
        return;
      }
      node.style.transition = "transform 200ms ease-out, opacity 200ms ease-out";
      node.style.transform =
        Math.abs(dx) > Math.abs(dy)
          ? `translate3d(${Math.sign(dx) * 120}%, 0, 0)`
          : "translate3d(0, -120%, 0)";
      node.style.opacity = "0";
      hotToast.dismiss(toastId);
    }

    node.addEventListener("keydown", onKeyDown);
    node.addEventListener("pointerdown", onPointerDown);
    node.addEventListener("pointermove", onPointerMove);
    node.addEventListener("pointerup", onPointerEnd);
    node.addEventListener("pointercancel", onPointerEnd);
    return () => {
      node.removeEventListener("keydown", onKeyDown);
      node.removeEventListener("pointerdown", onPointerDown);
      node.removeEventListener("pointermove", onPointerMove);
      node.removeEventListener("pointerup", onPointerEnd);
      node.removeEventListener("pointercancel", onPointerEnd);
    };
  }, [toastId]);

  return (
    <div
      className={cn("absolute inset-x-0 top-0 flex justify-center", item.visible && "z-[9999]")}
      ref={measure}
      style={{
        transform: `translateY(${offset}px)`,
        transition: prefersReducedMotion() ? undefined : "all 230ms cubic-bezier(.21,1.02,.73,1)",
      }}
    >
      <div
        className="pointer-events-auto touch-none select-none"
        data-slot="toast"
        data-type={item.type}
        data-visible={item.visible}
        ref={swipeRef}
      >
        <ToastBar position="top-center" toast={item} />
      </div>
    </div>
  );
}

function CloseButton({ id }: { id: string }) {
  return (
    <Button
      aria-label="Dismiss notification"
      className="-my-0.5 -mr-1.5 text-muted-foreground"
      onClick={() => hotToast.dismiss(id)}
      size="icon-xs"
      variant="ghost"
    >
      <X aria-hidden="true" />
    </Button>
  );
}

export type ToastActionOptions = Omit<ToastOptions, "icon"> & {
  /** Short text below the title (makes the toast two lines tall). */
  description?: string;
  /** Optional icon on the left (lucide), drawn in neutral ink. */
  icon?: LucideIcon;
  /** Action verb: "Undo", "Update card". */
  label: string;
  onAction: () => void;
  /** Second action, outlined beside the first (for example "Undo" beside "Apply to 12 pending"). */
  secondary?: { label: string; onAction: () => void };
};

/** Content of a toast with an action: title (+ description), verb button and dismiss button. */
function ActionContent({
  description,
  label,
  message,
  onAction,
  secondary,
  toastId,
}: {
  description: string | undefined;
  label: string;
  message: Renderable;
  onAction: () => void;
  secondary: ToastActionOptions["secondary"];
  toastId: string;
}) {
  const button = (text: string, run: () => void, variant: "ghost" | "outline") => (
    <Button
      className="h-6 rounded-md px-2 text-label"
      onClick={() => {
        run();
        hotToast.dismiss(toastId);
      }}
      size="xs"
      variant={variant}
    >
      {text}
    </Button>
  );
  const actionButton = (
    <>
      {button(label, onAction, description === undefined ? "ghost" : "outline")}
      {secondary === undefined ? null : button(secondary.label, secondary.onAction, "ghost")}
    </>
  );

  if (description === undefined) {
    return (
      <span className="flex w-full items-center gap-2 text-left">
        <span className="min-w-0 flex-1">{message}</span>
        <span className="-my-1 flex shrink-0 items-center gap-0.5">
          {actionButton}
          <CloseButton id={toastId} />
        </span>
      </span>
    );
  }

  return (
    <span className="flex w-full items-start gap-2 text-left">
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-semibold">{message}</span>
        <span className="text-label text-muted-foreground">{description}</span>
        <span className="mt-1.5 flex gap-1">{actionButton}</span>
      </span>
      <CloseButton id={toastId} />
    </span>
  );
}

function iconSlot(Icon: LucideIcon, className: string, slot: string) {
  return (
    <span
      className="flex size-5 shrink-0 items-center justify-center motion-safe:animate-[ds-toast-icon-in_300ms_120ms_cubic-bezier(.175,.885,.32,1.275)_both]"
      data-slot={slot}
    >
      <Icon aria-hidden="true" className={cn("size-4", className)} strokeWidth={2} />
    </span>
  );
}

type Message = Renderable;

function action(
  message: Message,
  { description, icon, label, onAction, secondary, ...options }: ToastActionOptions,
) {
  return hotToast(
    (current) => (
      <ActionContent
        description={description}
        label={label}
        message={message}
        onAction={onAction}
        secondary={secondary}
        toastId={current.id}
      />
    ),
    {
      duration: TOAST_DURATIONS.action,
      ...options,
      ...(icon === undefined ? {} : { icon: iconSlot(icon, "text-foreground", "toast-icon") }),
    },
  );
}

type PromiseMessages<T> = {
  error?: ValueOrFunction<Renderable, unknown>;
  loading: Renderable;
  success?: ValueOrFunction<Renderable, T>;
};

/** Loading → success or error, in the same card. */
function promise<T>(
  task: Promise<T> | (() => Promise<T>),
  messages: PromiseMessages<T>,
  options?: DefaultToastOptions,
): Promise<T> {
  return hotToast.promise(task, messages, options);
}

/** Toast for something the AI did: the design-system violet icon (Sparkles in --ai-ink) in place of the default. */
function ai(message: Message, options?: ToastOptions) {
  return hotToast(message, {
    ...options,
    icon: iconSlot(Sparkles, "text-ai-ink", "toast-ai-icon"),
  });
}

/**
 * `toast(msg)`, `toast.success`, `toast.error`, `toast.loading`, `toast.promise`, `toast.dismiss`
 * (from react-hot-toast) and, from the design system, `toast.action(msg, { label, onAction, description? })`
 * and `toast.ai(msg)`.
 */
export const toast = Object.assign(
  (message: Message, options?: ToastOptions) => hotToast(message, options),
  {
    action,
    ai,
    dismiss: (id?: string) => hotToast.dismiss(id),
    error: (message: Message, options?: ToastOptions) => hotToast.error(message, options),
    loading: (message: Message, options?: ToastOptions) => hotToast.loading(message, options),
    promise,
    remove: (id?: string) => hotToast.remove(id),
    success: (message: Message, options?: ToastOptions) => hotToast.success(message, options),
  },
);
