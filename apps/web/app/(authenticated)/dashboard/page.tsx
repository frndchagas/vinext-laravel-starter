"use client";

import { KeyRound, LayoutDashboard, MailCheck, Radio, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { useAuthenticatedUser } from "@/components/authenticated-shell";
import { TitledCard } from "@/components/ds/card";
import { Disclosure } from "@/components/ds/disclosure";
import { Greeting } from "@/components/ds/greeting";
import { type KpiItem, KpiStrip } from "@/components/ds/kpi-strip";
import { PageHeader } from "@/components/ds/page-header";
import { StatusPill } from "@/components/ds/pill";
import { StatusDot, type DotTone } from "@/components/ds/status-dot";
import { buttonVariants } from "@/components/ui/button";
import { getEcho } from "@/lib/echo";

type RealtimeStatus = "connecting" | "connected" | "unavailable";

const REALTIME = {
  connected: { label: "Realtime connected", tone: "positive" },
  connecting: { label: "Connecting…", tone: "neutral" },
  unavailable: { label: "Realtime unavailable", tone: "attention" },
} as const satisfies Record<RealtimeStatus, { label: string; tone: DotTone }>;

/** First word of the name, for the greeting ("Good morning, Ada!"). */
function firstNameOf(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

function twoFactorValue(me: { two_factor_enabled: boolean; two_factor_confirmed: boolean }) {
  if (me.two_factor_enabled && me.two_factor_confirmed) return "Active";
  if (me.two_factor_enabled) return "Pending confirmation";
  return "Off";
}

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

  // Only what the session really knows about the account: nothing is counted or estimated here.
  const kpis: KpiItem[] = [
    {
      icon: MailCheck,
      key: "email",
      label: "Email",
      note: me.email,
      value: me.email_verified ? "Verified" : "Unverified",
    },
    {
      cta: { href: "/settings", label: "Security settings" },
      icon: ShieldCheck,
      key: "two-factor",
      label: "Two-factor authentication",
      value: twoFactorValue(me),
    },
    {
      icon: KeyRound,
      key: "permissions",
      label: "Permissions",
      note: "Granted by Laravel for this session",
      value: me.permissions.length,
    },
  ];

  const channelState = REALTIME[realtime];

  return (
    <>
      <PageHeader icon={LayoutDashboard} title="Dashboard" titleAs="p" />
      <Greeting
        as="h1"
        name={firstNameOf(me.name)}
        summary="Your account, security state and realtime connection, as Laravel reports them."
      />

      <KpiStrip ariaLabel="Account at a glance" items={kpis} />

      <div className="grid gap-stack lg:grid-cols-2 lg:items-start">
        <TitledCard
          actions={
            <Link className={buttonVariants({ size: "sm", variant: "outline" })} href="/settings">
              Manage account
            </Link>
          }
          description={me.email}
          icon={UserRound}
          title={me.name}
          wrap
        >
          <ul aria-label="Account state" className="flex flex-wrap gap-row">
            <li>
              {me.email_verified ? (
                <StatusPill tone="positive">Email verified</StatusPill>
              ) : (
                <StatusPill tone="attention">Email not verified</StatusPill>
              )}
            </li>
            {me.roles.length === 0 ? (
              <li>
                <StatusPill dot>No role assigned</StatusPill>
              </li>
            ) : (
              me.roles.map((role) => (
                <li key={role}>
                  <StatusPill tone="outline">{role}</StatusPill>
                </li>
              ))
            )}
          </ul>
          <p className="text-body text-muted-foreground">
            Manage your profile, password and security settings.
          </p>
        </TitledCard>

        <TitledCard
          description="Private channel over Laravel Reverb"
          icon={Radio}
          title="Realtime connection"
        >
          <p aria-live="polite" className="text-body">
            <StatusDot tone={channelState.tone}>{channelState.label}</StatusDot>
          </p>
          <Disclosure label="Session details">
            <dl className="grid gap-row text-body">
              <div>
                <dt className="font-medium text-foreground">User ID</dt>
                <dd className="mt-0.5 font-mono text-caption break-all text-muted-foreground">
                  {me.id}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-foreground">Permissions</dt>
                <dd className="mt-0.5 break-words text-muted-foreground">
                  {me.permissions.join(", ") || "none"}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-foreground">Private channel</dt>
                <dd className="mt-0.5 break-all text-muted-foreground">
                  {realtime === "connected"
                    ? `Subscribed to users.${me.id}`
                    : realtime === "unavailable"
                      ? "Realtime unavailable"
                      : "Connecting…"}
                </dd>
              </div>
            </dl>
          </Disclosure>
        </TitledCard>
      </div>
    </>
  );
}
