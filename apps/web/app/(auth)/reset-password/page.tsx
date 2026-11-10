"use client";

import { useResetPassword } from "@vinext-laravel-starter/api-client";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { formValue } from "@/lib/form";
import { validationErrors } from "@/lib/problem";
import { useHydrated } from "@/lib/use-hydrated";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hydrated = useHydrated();
  const resetMutation = useResetPassword();

  const token = searchParams.get("token") ?? "";
  const initialEmail = searchParams.get("email") ?? "";

  const errors =
    resetMutation.data?.status === 422 ? validationErrors(resetMutation.data.data) : {};

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);

    resetMutation.mutate(
      {
        data: {
          token,
          email: formValue(form, "email"),
          password: formValue(form, "password"),
          password_confirmation: formValue(form, "password_confirmation"),
        },
      },
      {
        onSuccess: (response) => {
          if (response.status === 200) {
            router.push("/login");
          }
        },
      },
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-stack">
      <h1 className="text-title text-balance">Choose a new password</h1>
      {errors["token"] !== undefined ? (
        <p
          role="alert"
          className="rounded-lg border border-border px-3 py-2 text-body text-pretty text-negative"
        >
          This reset link is invalid or expired. Request a new one.
        </p>
      ) : null}
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        defaultValue={initialEmail}
        errors={errors["email"]}
      />
      <Field
        label="New password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        errors={errors["password"]}
      />
      <Field
        label="Confirm new password"
        name="password_confirmation"
        type="password"
        autoComplete="new-password"
        required
        errors={errors["password_confirmation"]}
      />
      <Button
        type="submit"
        size="lg"
        disabled={!hydrated}
        pending={resetMutation.isPending}
        pendingLabel="Saving…"
      >
        Reset password
      </Button>
    </form>
  );
}
