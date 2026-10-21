import SiLaravel from "@icons-pack/react-simple-icons/icons/SiLaravel";
import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { createHomeMetadata, getSiteConfig } from "@/lib/site-config";

const decisions = [
  {
    description: "Laravel owns sessions, policies and private channels.",
    title: "One source of identity",
  },
  {
    description: "TypeSpec emits OpenAPI; Orval generates Fetch, Query, Zod and MSW artifacts.",
    title: "Contracts before clients",
  },
  {
    description: "Reverb and Echo are configured from the start.",
    title: "Realtime in the first working slice",
  },
  {
    command: "bun run check",
    description: "One command runs format, lint, types, tests and build.",
    title: "Checks are executable",
  },
] as const;

function VinextMark() {
  return (
    <svg aria-hidden="true" className="size-7" fill="none" viewBox="0 0 32 32">
      <path d="M4 6 12 26 20 6" stroke="currentColor" strokeWidth="3" />
      <path d="m18 11 9 10m0-10-9 10" stroke="currentColor" strokeWidth="2.5" />
    </svg>
  );
}

function ReverbMark() {
  return (
    <svg aria-hidden="true" className="size-7" fill="none" viewBox="0 0 32 32">
      <rect fill="currentColor" height="32" width="32" />
      <circle cx="16" cy="16" fill="var(--background)" r="2" />
      <circle cx="16" cy="16" r="5" stroke="var(--background)" strokeWidth="1.5" />
      <circle cx="16" cy="16" r="8" stroke="var(--background)" strokeWidth="1.5" />
      <circle cx="16" cy="16" r="11" stroke="var(--background)" strokeWidth="1.5" />
    </svg>
  );
}

export const revalidate = 300;
export const metadata: Metadata = createHomeMetadata();

export default function Home() {
  const repositoryUrl = getSiteConfig().repositoryUrl;

  return (
    <>
      <a
        className="sr-only z-50 bg-background px-4 py-2 text-sm font-semibold focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:ring-3 focus:ring-ring/50"
        href="#main-content"
      >
        Skip to content
      </a>

      <main className="min-h-dvh bg-background text-foreground" id="main-content">
        <header className="border-b border-border">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-5 sm:px-8 lg:px-10">
            <a
              aria-label="Vinext Laravel Starter home"
              className="font-display text-3xl leading-none"
              href="#main-content"
            >
              V<span className="text-primary">L</span>
            </a>
            <nav
              aria-label="Main navigation"
              className="flex items-center gap-6 text-sm font-medium"
            >
              <a className="hidden hover:text-primary sm:block" href="#architecture">
                Architecture
              </a>
              <a className="hidden hover:text-primary sm:block" href="#decisions">
                Baseline
              </a>
              <a className="hover:text-primary" href="#install">
                Install
              </a>
              {repositoryUrl ? (
                <a
                  className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
                  href={repositoryUrl.href}
                  rel="noreferrer"
                  target="_blank"
                >
                  View on GitHub
                  <ArrowRight aria-hidden="true" className="size-4 -rotate-45" />
                </a>
              ) : null}
            </nav>
          </div>
        </header>

        <section className="mx-auto grid max-w-7xl gap-12 px-6 py-14 sm:px-8 sm:py-20 lg:grid-cols-[minmax(0,1.1fr)_minmax(22rem,0.9fr)] lg:items-center lg:gap-16 lg:px-10">
          <div>
            <h1
              aria-label="Vinext Laravel Starter"
              className="max-w-3xl font-display text-6xl leading-none text-balance sm:text-7xl lg:text-8xl"
            >
              Vinext Laravel<span className="block">Starter</span>
            </h1>
            <h2 className="mt-8 max-w-xl text-xl font-semibold text-balance">
              A serious Laravel starting point for coding agents.
            </h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-pretty text-muted-foreground">
              Vinext handles the interface. Laravel owns identity, permissions and durable state.
              Typed contracts, queues and realtime are part of the baseline.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <a className={buttonVariants({ className: "h-11 px-5", size: "lg" })} href="#install">
                View installation
                <ArrowRight aria-hidden="true" className="size-4" />
              </a>
              <Link
                className={buttonVariants({
                  className: "h-11 px-5",
                  size: "lg",
                  variant: "outline",
                })}
                href="/login"
              >
                Sign in
              </Link>
            </div>
          </div>

          <aside
            aria-labelledby="architecture-heading"
            className="min-w-0 border-t border-border pt-8 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-10"
            id="architecture"
          >
            <h2 className="text-lg font-semibold text-balance" id="architecture-heading">
              Architecture
            </h2>
            <p className="mt-5 flex items-center gap-3 text-sm text-muted-foreground">
              Browser <ArrowRight aria-hidden="true" className="size-4" /> Caddy · same-origin
            </p>
            <dl className="mt-4 divide-y divide-border border-y border-border">
              <div className="flex items-center justify-between gap-4 py-5">
                <dt className="flex items-center gap-3 font-semibold">
                  <span className="text-primary">
                    <VinextMark />
                  </span>
                  Vinext
                </dt>
                <dd className="font-mono text-xs text-muted-foreground">/</dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-5">
                <dt className="flex items-center gap-3 font-semibold">
                  <SiLaravel aria-hidden="true" className="size-7 text-primary" title="" />
                  Laravel
                </dt>
                <dd className="font-mono text-xs text-muted-foreground">/api/*</dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-5">
                <dt className="flex items-center gap-3 font-semibold">
                  <span className="text-primary">
                    <ReverbMark />
                  </span>
                  Reverb
                </dt>
                <dd className="font-mono text-xs text-muted-foreground">/ws/*</dd>
              </div>
            </dl>
            <p className="mt-5 text-sm leading-6 text-pretty text-muted-foreground">
              Laravel data services: PostgreSQL and Redis.
            </p>
          </aside>
        </section>

        <section
          aria-labelledby="install-heading"
          className="border-y border-border bg-muted/40"
          id="install"
        >
          <div className="mx-auto max-w-7xl px-6 py-8 sm:px-8 lg:px-10">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="text-lg font-semibold text-balance" id="install-heading">
                Install
              </h2>
              <p className="text-sm text-muted-foreground">Owned snapshot, no updater</p>
            </div>
            <code className="mt-4 block font-mono text-sm leading-7 break-words whitespace-pre-wrap">
              laravel new my-app --using=frndchagas/vinext-laravel-starter --phpunit --bun
              --no-boost
            </code>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-12 sm:px-8 sm:py-16 lg:px-10" id="decisions">
          <h2 className="max-w-3xl font-display text-4xl leading-tight text-balance sm:text-5xl">
            The baseline settles the recurring decisions.
          </h2>
          <div className="mt-8 divide-y divide-border">
            {decisions.map((decision) => (
              <article
                className="grid gap-3 py-6 sm:grid-cols-[16rem_minmax(0,1fr)] sm:gap-8"
                key={decision.title}
              >
                <h3 className="text-lg font-semibold text-balance">{decision.title}</h3>
                <div>
                  <p className="max-w-2xl text-sm leading-6 text-pretty text-muted-foreground">
                    {decision.description}
                  </p>
                  {"command" in decision ? (
                    <code className="mt-2 block font-mono text-sm">{decision.command}</code>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </section>

        <footer className="border-t border-border" id="license">
          <p className="mx-auto max-w-7xl px-6 py-6 text-sm text-muted-foreground sm:px-8 lg:px-10">
            Independent community project. MIT licensed.
          </p>
        </footer>
      </main>
    </>
  );
}
