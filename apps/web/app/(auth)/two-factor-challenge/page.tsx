"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  getGetMeQueryKey,
  useCompleteTwoFactorChallenge,
} from "@vinext-laravel-starter/api-client";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { formValue } from "@/lib/form";
import { problemDetail, validationErrors } from "@/lib/problem";
import { useHydrated } from "@/lib/use-hydrated";

export default function TwoFactorChallengePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const hydrated = useHydrated();
  const challengeMutation = useCompleteTwoFactorChallenge();
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const errors =
    challengeMutation.data?.status === 422 ? validationErrors(challengeMutation.data.data) : {};
  const rateLimitMessage =
    challengeMutation.data?.status === 429
      ? problemDetail(challengeMutation.data.data, "Too many attempts. Try again shortly.")
      : undefined;

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    challengeMutation.mutate(
      {
        data: useRecoveryCode
          ? { recovery_code: formValue(form, "recovery_code") }
          : { code: formValue(form, "code") },
      },
      {
        onSuccess: (response) => {
          if (response.status !== 204) return;
          queryClient.removeQueries({ queryKey: getGetMeQueryKey() });
          router.push("/dashboard");
        },
      },
    );
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={submit}>
      <div>
        <h1 className="font-[family-name:var(--font-app-display)] text-xl text-balance">
          Two-factor challenge
        </h1>
        <p className="mt-1 text-sm text-pretty text-muted-foreground">
          {useRecoveryCode
            ? "Enter one of your recovery codes."
            : "Enter the current code from your authenticator application."}
        </p>
      </div>

      {rateLimitMessage ? (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {rateLimitMessage}
        </p>
      ) : null}

      {useRecoveryCode ? (
        <Field
          autoComplete="one-time-code"
          errors={errors["recovery_code"]}
          label="Recovery code"
          name="recovery_code"
          required
        />
      ) : (
        <Field
          autoComplete="one-time-code"
          errors={errors["code"]}
          inputMode="numeric"
          label="Authentication code"
          name="code"
          pattern="[0-9]*"
          required
        />
      )}

      <Button disabled={!hydrated || challengeMutation.isPending} size="lg" type="submit">
        {challengeMutation.isPending ? "Checking…" : "Continue"}
      </Button>
      <Button
        onClick={() => setUseRecoveryCode((current) => !current)}
        type="button"
        variant="link"
      >
        {useRecoveryCode ? "Use an authentication code" : "Use a recovery code"}
      </Button>
    </form>
  );
}
