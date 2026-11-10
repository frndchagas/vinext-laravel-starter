"use client";

import { AlertDialog } from "@base-ui/react/alert-dialog";
import { useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { cn } from "@/lib/utils";

interface PasswordActionDialogProps {
  actionLabel: string;
  description: string;
  passwordId: string;
  title: string;
  triggerLabel: string;
  destructive?: boolean;
  onConfirm: (password: string) => Promise<string | undefined>;
}

export function PasswordActionDialog({
  actionLabel,
  description,
  destructive = false,
  onConfirm,
  passwordId,
  title,
  triggerLabel,
}: PasswordActionDialogProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setPending(true);

    try {
      const form = new FormData(event.currentTarget);
      const password = form.get("password");
      const nextError = await onConfirm(typeof password === "string" ? password : "");

      if (nextError) {
        setError(nextError);
        setPending(false);
        return;
      }

      setOpen(false);
    } catch {
      setError("The action could not be completed. Try again.");
    }

    setPending(false);
  }

  return (
    <AlertDialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setError(undefined);
      }}
    >
      <AlertDialog.Trigger
        className={buttonVariants({ variant: destructive ? "destructive" : "outline" })}
      >
        {triggerLabel}
      </AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="fixed inset-0 z-40 bg-black/10 supports-backdrop-filter:backdrop-blur-xs" />
        <AlertDialog.Viewport className="fixed inset-0 z-50 flex items-center justify-center p-4 [padding-top:max(1rem,env(safe-area-inset-top))] [padding-bottom:max(1rem,env(safe-area-inset-bottom))]">
          <AlertDialog.Popup className="w-full max-w-md rounded-card bg-popover p-card text-popover-foreground shadow-popover ring-1 ring-border">
            <AlertDialog.Title className="text-title text-balance">{title}</AlertDialog.Title>
            <AlertDialog.Description className="mt-2 text-body text-pretty text-muted-foreground">
              {description}
            </AlertDialog.Description>

            <form className="mt-5 flex flex-col gap-4" onSubmit={submit}>
              <Field
                id={passwordId}
                autoComplete="current-password"
                errors={error ? [error] : undefined}
                label="Current password"
                name="password"
                required
                type="password"
              />
              <div className="flex justify-end gap-2">
                <AlertDialog.Close
                  className={cn(buttonVariants({ variant: "outline" }))}
                  disabled={pending}
                  type="button"
                >
                  Cancel
                </AlertDialog.Close>
                <Button
                  pending={pending}
                  pendingLabel="Working…"
                  type="submit"
                  variant={destructive ? "destructive" : "default"}
                >
                  {actionLabel}
                </Button>
              </div>
            </form>
          </AlertDialog.Popup>
        </AlertDialog.Viewport>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
