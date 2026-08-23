"use client";

import { useEffect, useState } from "react";

import { useAuthenticatedUser } from "@/components/authenticated-shell";
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
        <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
          Dashboard
        </p>
        <h1 className="mt-1 font-[family-name:var(--font-app-display)] text-4xl text-balance">
          Welcome, {me.name}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{me.email}</p>
      </header>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            Session
          </h2>
          <dl className="mt-3 flex flex-col gap-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">User ID</dt>
              <dd className="truncate font-mono text-xs leading-5">{me.id}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Email verified</dt>
              <dd>{me.email_verified ? "Yes" : "No"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Roles</dt>
              <dd>{me.roles.join(", ") || "none"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Permissions</dt>
              <dd className="text-right">{me.permissions.join(", ") || "none"}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            Realtime
          </h2>
          <p className="mt-3 flex items-center gap-2 text-sm" aria-live="polite">
            <span
              aria-hidden
              className={
                realtime === "connected"
                  ? "size-2 rounded-full bg-primary"
                  : "size-2 rounded-full bg-muted-foreground/40"
              }
            />
            {realtime === "connected"
              ? `Subscribed to users.${me.id}`
              : realtime === "unavailable"
                ? "Realtime unavailable"
                : "Connecting…"}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Private channel authorized through the same Laravel session.
          </p>
        </div>
      </section>
    </>
  );
}
