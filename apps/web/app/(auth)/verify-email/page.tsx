"use client";

import {
  useGetMe,
  useLogout,
  useResendEmailVerification,
} from "@vinext-laravel-starter/api-client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { problemDetail } from "@/lib/problem";

export default function VerifyEmailPage() {
  const router = useRouter();
  const meQuery = useGetMe();
  const resendMutation = useResendEmailVerification();
  const logoutMutation = useLogout();

  const me = meQuery.data?.status === 200 ? meQuery.data.data : undefined;
  const rateLimitMessage =
    resendMutation.data?.status === 429
      ? problemDetail(resendMutation.data.data, "Too many requests. Try again shortly.")
      : undefined;

  useEffect(() => {
    if (meQuery.data?.status === 401) {
      router.replace("/login");
    }

    if (me?.email_verified === true) {
      router.replace("/dashboard");
    }
  }, [meQuery.data?.status, me?.email_verified, router]);

  return (
    <div className="flex flex-col gap-stack">
      <h1 className="text-title text-balance">Verify your email</h1>
      <p className="text-body text-muted-foreground">
        We sent a verification link{me ? ` to ${me.email}` : ""}. Click it to unlock the rest of the
        application.
      </p>
      {resendMutation.data?.status === 202 ? (
        <output className="block rounded-lg border border-border px-3 py-2 text-body text-pretty text-foreground">
          A new verification link is on its way.
        </output>
      ) : null}
      {rateLimitMessage ? (
        <p
          role="alert"
          className="rounded-lg border border-border px-3 py-2 text-body text-pretty text-negative"
        >
          {rateLimitMessage}
        </p>
      ) : null}
      <Button
        size="lg"
        pending={resendMutation.isPending}
        pendingLabel="Sending…"
        onClick={() => resendMutation.mutate()}
      >
        Resend verification email
      </Button>
      <Button
        variant="ghost"
        pending={logoutMutation.isPending}
        pendingLabel="Signing out…"
        onClick={() => logoutMutation.mutate(undefined, { onSuccess: () => router.push("/login") })}
      >
        Sign out
      </Button>
    </div>
  );
}
