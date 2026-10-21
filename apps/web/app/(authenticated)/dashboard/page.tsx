"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useAuthenticatedUser } from "@/components/authenticated-shell";
import { buttonVariants } from "@/components/ui/button";
import { getEcho } from "@/lib/echo";

type RealtimeStatus = "connecting" | "connected" | "unavailable";

export default function DashboardPage() {
  const me = useAuthenticatedUser();
  const [realtime, setRealtime] = useState<RealtimeStatus>("connecting");

  useEffect(() => {
    const echo = getEcho();
    const channel = echo.private(`users.${me.id}`);

    channel.subscribed(() => setRealtime("connected"));
    channel.error(() => setRealtime("unavailable"));

    return () => {
      echo.leave(`users.${me.id}`);
    };
  }, [me.id]);

  return (
    <>
      <header className="border-b border-border pb-6">
        <h1 className="font-[family-name:var(--font-app-display)] text-4xl text-balance">
          Welcome, {me.name}
        </h1>
        <p className="mt-2 text-sm break-all text-muted-foreground">{me.email}</p>
        <p className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span>{me.email_verified ? "Email verified" : "Email not verified"}</span>
          <span aria-hidden="true">·</span>
          <span>{me.roles.join(", ") || "No role assigned"}</span>
        </p>
      </header>

      <section aria-labelledby="account-heading">
        <h2 className="text-xl font-semibold text-balance" id="account-heading">
          Your account
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-pretty text-muted-foreground">
          Manage your profile, password and security settings.
        </p>
        <Link className={buttonVariants({ className: "mt-5 h-11 px-4" })} href="/settings">
          Manage account
        </Link>
      </section>

      <section aria-label="Connection" className="border-t border-border pt-6">
        <p className="flex items-center gap-2 text-sm" aria-live="polite">
          <span
            aria-hidden="true"
            className={
              realtime === "connected"
                ? "size-2 rounded-full bg-primary"
                : "size-2 rounded-full bg-muted-foreground/40"
            }
          />
          {realtime === "connected"
            ? "Realtime connected"
            : realtime === "unavailable"
              ? "Realtime unavailable"
              : "Connecting…"}
        </p>
        <details className="mt-3 text-sm text-muted-foreground">
          <summary className="w-fit cursor-pointer py-2 underline-offset-4 hover:text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
            Session details
          </summary>
          <dl className="mt-3 grid max-w-xl gap-4">
            <div>
              <dt className="font-medium text-foreground">User ID</dt>
              <dd className="mt-1 font-mono text-xs break-all">{me.id}</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">Permissions</dt>
              <dd className="mt-1 break-words">{me.permissions.join(", ") || "none"}</dd>
            </div>
            <div>
              <dt className="font-medium text-foreground">Private channel</dt>
              <dd className="mt-1 break-all">
                {realtime === "connected"
                  ? `Subscribed to users.${me.id}`
                  : realtime === "unavailable"
                    ? "Realtime unavailable"
                    : "Connecting…"}
              </dd>
            </div>
          </dl>
        </details>
      </section>
    </>
  );
}
