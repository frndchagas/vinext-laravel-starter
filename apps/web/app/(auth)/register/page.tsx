"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useGetAuthCapabilities, useRegister } from "@vinext-laravel-starter/api-client";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button, buttonVariants } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { formValue } from "@/lib/form";
import { problemDetail, validationErrors } from "@/lib/problem";
import { clearSession } from "@/lib/session";
import { useHydrated } from "@/lib/use-hydrated";

export default function RegisterPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const hydrated = useHydrated();
  const registerMutation = useRegister();
  const capabilitiesQuery = useGetAuthCapabilities();

  const errors =
    registerMutation.data?.status === 422 ? validationErrors(registerMutation.data.data) : {};
  const disabledMessage =
    registerMutation.data?.status === 403
      ? problemDetail(registerMutation.data.data, "Registration is disabled.")
      : undefined;
  const rateLimitMessage =
    registerMutation.data?.status === 429
      ? problemDetail(
          registerMutation.data.data,
          "Too many registration attempts. Try again shortly.",
        )
      : undefined;
  const registrationEnabled =
    capabilitiesQuery.data?.status === 200 && capabilitiesQuery.data.data.registration;

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);

    registerMutation.mutate(
      {
        data: {
          name: formValue(form, "name"),
          email: formValue(form, "email"),
          password: formValue(form, "password"),
          password_confirmation: formValue(form, "password_confirmation"),
        },
      },
      {
        onSuccess: async (response) => {
          if (response.status === 201) {
            await clearSession(queryClient);
            router.push("/verify-email");
          }
        },
      },
    );
  }

  if (capabilitiesQuery.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="font-[family-name:var(--font-app-display)] text-xl text-balance text-foreground">
          Create account
        </h1>
        <output className="text-sm text-pretty text-muted-foreground">
          Checking registration availability…
        </output>
      </div>
    );
  }

  if (!registrationEnabled) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="font-[family-name:var(--font-app-display)] text-xl text-balance text-foreground">
          Registration unavailable
        </h1>
        <p className="text-sm text-pretty text-muted-foreground">
          This deployment does not accept public registrations.
        </p>
        <Link href="/login" className={buttonVariants({ size: "lg" })}>
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <h1 className="font-[family-name:var(--font-app-display)] text-xl text-balance text-foreground">
        Create account
      </h1>
      {disabledMessage ? (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {disabledMessage}
        </p>
      ) : null}
      {rateLimitMessage ? (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {rateLimitMessage}
        </p>
      ) : null}
      <Field label="Name" name="name" autoComplete="name" required errors={errors["name"]} />
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        errors={errors["email"]}
      />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        errors={errors["password"]}
      />
      <Field
        label="Confirm password"
        name="password_confirmation"
        type="password"
        autoComplete="new-password"
        required
        errors={errors["password_confirmation"]}
      />
      <Button type="submit" size="lg" disabled={!hydrated || registerMutation.isPending}>
        {registerMutation.isPending ? "Creating account…" : "Create account"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Already registered?{" "}
        <Link href="/login" className="text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
