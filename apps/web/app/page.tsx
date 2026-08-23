import SiLaravel from "@icons-pack/react-simple-icons/icons/SiLaravel";
import SiPostgresql from "@icons-pack/react-simple-icons/icons/SiPostgresql";
import { AppWindow, Braces } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { buttonVariants } from "@/components/ui/button";
import { createHomeMetadata, getSiteConfig } from "@/lib/site-config";
import { cn } from "@/lib/utils";

const decisions = [
  {
    description: "Laravel owns sessions, policies and private channels.",
    number: "01",
    title: "One source of identity",
  },
  {
    description: "TypeSpec emits OpenAPI; Orval generates Fetch, Query, Zod and MSW artifacts.",
    number: "02",
    title: "Contracts before clients",
  },
  {
    description: "Reverb and Echo are configured from the start.",
    number: "03",
    title: "Realtime in the first working slice",
  },
  {
    description: "One command runs format, lint, types, tests and build.",
    number: "04",
    title: "Checks are executable",
  },
] as const;

type StackNodeProps = {
  icon: ReactNode;
  label: string;
  accent?: boolean;
  className?: string;
};

type MarkProps = {
  className?: string;
};

function VinextMark({ className }: MarkProps) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 32 32">
      <path d="M4 6 12 26 20 6" stroke="currentColor" strokeWidth="3" />
      <path d="m18 11 9 10m0-10-9 10" stroke="currentColor" strokeWidth="2.5" />
    </svg>
  );
}

function ReverbMark({ className }: MarkProps) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 32 32">
      <rect fill="currentColor" height="32" width="32" />
      <circle cx="16" cy="16" fill="var(--background)" r="2" />
      <circle cx="16" cy="16" r="5" stroke="var(--background)" strokeWidth="1.5" />
      <circle cx="16" cy="16" r="8" stroke="var(--background)" strokeWidth="1.5" />
      <circle cx="16" cy="16" r="11" stroke="var(--background)" strokeWidth="1.5" />
    </svg>
  );
}

function RedisMark({ className }: MarkProps) {
  return (
    <svg aria-hidden="true" className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M10.5 2.661l.54.997-1.797.644 2.409.218.748 1.246.467-1.121 2.077-.208-1.61-.613.426-1.017-1.578.519zm6.905 2.077L13.76 6.182l3.292 1.298.353-.146 3.293-1.298zm-10.51.312a2.97 1.153 0 0 0-2.97 1.152 2.97 1.153 0 0 0 2.97 1.153 2.97 1.153 0 0 0 2.97-1.153 2.97 1.153 0 0 0-2.97-1.152zM24 6.805s-8.983 4.278-10.395 4.953c-1.226.561-1.901.561-3.261.094C8.318 11.022 0 7.241 0 7.241v1.038c0 .24.332.499.966.8 1.277.613 8.34 3.677 9.45 4.206 1.112.53 1.9.54 3.313-.197 1.412-.738 8.049-3.905 9.326-4.57.654-.342.945-.602.945-.84zm-10.042.602L8.39 8.26l3.884 1.61zM24 10.637s-8.983 4.279-10.395 4.954c-1.226.56-1.901.56-3.261.093C8.318 14.854 0 11.074 0 11.074v1.038c0 .238.332.498.966.8 1.277.612 8.34 3.676 9.45 4.205 1.112.53 1.9.54 3.313-.197 1.412-.737 8.049-3.905 9.326-4.57.654-.332.945-.602.945-.84zm0 3.842-10.395 4.954c-1.226.56-1.901.56-3.261.094C8.318 18.696 0 14.916 0 14.916v1.038c0 .239.332.499.966.8 1.277.613 8.34 3.676 9.45 4.206 1.112.53 1.9.54 3.313-.198 1.412-.737 8.049-3.904 9.326-4.569.654-.343.945-.613.945-.841z" />
    </svg>
  );
}

function StackNode({ accent = false, className, icon, label }: StackNodeProps) {
  return (
    <div
      className={cn(
        "grid min-h-20 grid-cols-[3rem_1fr] items-center border border-foreground/70 bg-background px-4",
        className,
      )}
    >
      <span aria-hidden="true" className={cn("text-muted-foreground", accent && "text-primary")}>
        {icon}
      </span>
      <span className="text-base font-semibold text-balance">{label}</span>
    </div>
  );
}

export const revalidate = 300;
export const metadata: Metadata = createHomeMetadata();

export default function Home() {
  const repositoryUrl = getSiteConfig().repositoryUrl;

  return (
    <>
      <a
        className="absolute top-3 left-3 z-50 -translate-y-20 bg-foreground px-4 py-2 text-sm font-semibold text-background focus:translate-y-0"
        href="#main-content"
      >
        Skip to content
      </a>

      <main className="min-h-dvh bg-background text-foreground" id="main-content">
        <header className="border-b border-border">
          <div className="mx-auto grid max-w-7xl grid-cols-[auto_1fr_auto] items-center px-5 sm:px-8 lg:px-10">
            <a
              aria-label="Vinext Laravel Starter home"
              className="flex h-20 items-center border-r border-border pr-6 sm:pr-8"
              href="#main-content"
            >
              <span className="font-display text-4xl leading-none">V</span>
              <span className="font-display text-4xl leading-none text-primary">L</span>
            </a>

            <nav
              aria-label="Main navigation"
              className="hidden items-center justify-center gap-8 sm:flex"
            >
              <a className="text-sm font-medium hover:text-primary" href="#architecture">
                Architecture
              </a>
              <a className="text-sm font-medium hover:text-primary" href="#decisions">
                Baseline
              </a>
              <a className="text-sm font-medium hover:text-primary" href="#install">
                Install
              </a>
            </nav>

            <a
              className="border-l border-border pl-5 text-sm font-medium text-muted-foreground hover:text-foreground sm:pl-8"
              href="#license"
            >
              MIT licensed
            </a>
          </div>
        </header>

        <section className="mx-auto grid max-w-7xl border-x border-border lg:min-h-[calc(100dvh-5rem)] lg:grid-cols-[minmax(0,1.08fr)_minmax(28rem,0.92fr)]">
          <div className="flex flex-col justify-between border-b border-border px-5 py-14 sm:px-8 sm:py-20 lg:border-r lg:border-b-0 lg:px-10 lg:py-14">
            <div>
              <p className="max-w-sm text-sm font-medium text-pretty text-muted-foreground">
                Open-source foundation designed for coding agents
              </p>
              <h1
                aria-label="Vinext Laravel Starter"
                className="mt-10 max-w-4xl font-display text-6xl leading-none text-balance sm:text-7xl lg:text-8xl xl:text-9xl"
              >
                Vinext Laravel
                <span className="block">Starter</span>
              </h1>
            </div>

            <div className="mt-16 max-w-2xl lg:mt-10">
              <div aria-hidden="true" className="mb-7 h-0.5 w-12 bg-primary" />
              <h2 className="text-xl font-semibold text-balance sm:text-2xl">
                A serious Laravel starting point for coding agents.
              </h2>
              <p className="mt-4 max-w-xl text-base leading-7 text-pretty text-muted-foreground sm:text-lg sm:leading-8">
                Vinext handles the interface. Laravel owns identity, permissions and durable state.
                Typed contracts, queues and realtime are part of the baseline.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                {repositoryUrl ? (
                  <a
                    className={buttonVariants({
                      className: "h-12 rounded-none bg-primary px-6 text-primary-foreground",
                      size: "lg",
                    })}
                    href={repositoryUrl.href}
                    rel="noreferrer"
                    target="_blank"
                  >
                    View on GitHub
                    <span aria-hidden="true">↗</span>
                  </a>
                ) : (
                  <a
                    className={buttonVariants({
                      className: "h-12 rounded-none bg-primary px-6 text-primary-foreground",
                      size: "lg",
                    })}
                    href="#install"
                  >
                    View installation
                    <span aria-hidden="true">→</span>
                  </a>
                )}
                <Link
                  className={buttonVariants({
                    className: "h-12 rounded-none border-foreground/60 px-6",
                    size: "lg",
                    variant: "outline",
                  })}
                  href="/login"
                >
                  Sign in
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
          </div>

          <aside
            aria-labelledby="architecture-heading"
            className="relative flex flex-col justify-between overflow-hidden"
            id="architecture"
          >
            <div aria-hidden="true" className="absolute inset-y-0 left-1/3 w-px bg-border/60" />
            <div aria-hidden="true" className="absolute inset-y-0 left-2/3 w-px bg-border/60" />
            <div className="relative flex items-center justify-between border-b border-border px-5 py-5 sm:px-8">
              <h2 className="text-xl font-semibold text-balance" id="architecture-heading">
                Architecture
              </h2>
              <span className="font-mono text-xs text-muted-foreground">same-origin</span>
            </div>

            <div className="relative px-5 py-8 sm:px-8 lg:py-6 xl:py-10">
              <div className="mx-auto max-w-xl">
                <StackNode
                  icon={<AppWindow className="size-7" strokeWidth={1.5} />}
                  label="Browser"
                />
                <div aria-hidden="true" className="mx-auto h-5 w-px bg-foreground/50" />
                <StackNode
                  accent
                  icon={<Braces className="size-7" />}
                  label="Caddy · same-origin"
                />
                <div aria-hidden="true" className="mx-auto h-5 w-px bg-foreground/50" />
                <p className="mb-3 text-center font-mono text-xs text-muted-foreground">
                  routes by path
                </p>
                <div className="grid gap-4 sm:grid-cols-3">
                  <StackNode accent icon={<VinextMark className="size-8" />} label="Vinext" />
                  <StackNode
                    accent
                    icon={<SiLaravel aria-hidden="true" className="size-7" title="" />}
                    label="Laravel"
                  />
                  <StackNode accent icon={<ReverbMark className="size-8" />} label="Reverb" />
                </div>
                <div aria-hidden="true" className="mx-auto h-5 w-px bg-foreground/50" />
                <p className="mb-3 text-center font-mono text-xs text-muted-foreground">
                  Laravel data services
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <StackNode
                    icon={<SiPostgresql aria-hidden="true" className="size-7" title="" />}
                    label="PostgreSQL"
                  />
                  <StackNode accent icon={<RedisMark className="size-7" />} label="Redis" />
                </div>
              </div>
            </div>

            <div
              className="relative grid gap-4 bg-foreground px-5 py-5 text-background sm:grid-cols-[1fr_auto] sm:items-center sm:px-8"
              id="install"
            >
              <code className="overflow-x-auto font-mono text-xs whitespace-nowrap sm:text-sm">
                <span className="mr-3 text-primary">›</span>
                laravel new my-app --using=frndchagas/vinext-laravel-starter --phpunit --bun
                --no-boost
              </code>
              <span className="flex items-center gap-2 text-sm">
                <span aria-hidden="true" className="size-2 bg-primary" />
                Owned snapshot, no updater
              </span>
            </div>
          </aside>
        </section>

        <section className="mx-auto max-w-7xl border-x border-t border-border" id="decisions">
          <div className="grid lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div>
              <div className="border-b border-border px-5 py-16 sm:px-8 sm:py-20 lg:px-10">
                <p className="text-sm font-medium text-muted-foreground">
                  What the starter decides
                </p>
                <h2 className="mt-6 max-w-5xl font-display text-5xl leading-none text-balance sm:text-6xl lg:text-7xl">
                  The baseline settles the recurring decisions
                  <span className="text-primary">.</span>
                </h2>
              </div>

              <div>
                {decisions.map((decision) => (
                  <article
                    className="grid border-b border-border sm:grid-cols-[6rem_minmax(0,1fr)] lg:grid-cols-[6rem_minmax(14rem,0.9fr)_minmax(16rem,1.1fr)]"
                    key={decision.number}
                  >
                    <span className="border-b border-border px-5 py-7 font-display text-4xl text-primary sm:border-r sm:border-b-0 sm:px-6 lg:py-8">
                      {decision.number}
                    </span>
                    <h3 className="border-b border-border px-5 py-7 text-xl font-semibold text-balance sm:border-b-0 sm:px-8 lg:border-r lg:py-8 lg:text-2xl">
                      {decision.title}
                    </h3>
                    <p className="px-5 py-7 text-base leading-7 text-pretty text-muted-foreground sm:col-start-2 sm:px-8 lg:col-start-auto lg:py-8">
                      {decision.description}
                    </p>
                  </article>
                ))}
              </div>
            </div>

            <aside className="flex flex-col justify-between border-t border-border px-5 py-10 sm:px-8 lg:border-t-0 lg:border-l">
              <div>
                <p className="text-sm font-semibold text-primary">Architecture</p>
                <ol className="mt-8 space-y-0" aria-label="Core architecture sequence">
                  {[
                    {
                      icon: <SiLaravel aria-hidden="true" className="size-6" title="" />,
                      label: "Laravel",
                    },
                    { icon: <Braces aria-hidden="true" className="size-6" />, label: "TypeSpec" },
                    { icon: <ReverbMark className="size-7" />, label: "Reverb" },
                  ].map(({ icon, label }, index) => (
                    <li className="grid grid-cols-[3rem_1fr]" key={label}>
                      <div className="flex flex-col items-center">
                        <span className="text-primary">{icon}</span>
                        {index < 2 ? (
                          <span aria-hidden="true" className="my-2 h-12 w-px bg-border" />
                        ) : null}
                      </div>
                      <span className="pt-1 text-lg font-semibold">{label}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="mt-14 border-t border-border pt-8">
                <p className="text-sm font-semibold text-primary">Command</p>
                <code className="mt-5 block font-mono text-sm">bun run check</code>
                <p className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
                  <span aria-hidden="true" className="size-2 bg-primary" />
                  ready
                </p>
              </div>
            </aside>
          </div>
        </section>

        <footer
          className="mx-auto flex max-w-7xl flex-col gap-4 border-x border-t border-border px-5 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10"
          id="license"
        >
          <p>Independent community project. MIT licensed.</p>
          {repositoryUrl ? (
            <a
              className="font-medium text-foreground hover:text-primary"
              href={repositoryUrl.href}
              rel="noreferrer"
              target="_blank"
            >
              View the repository <span aria-hidden="true">↗</span>
            </a>
          ) : (
            <a className="font-medium text-foreground hover:text-primary" href="#install">
              Installation <span aria-hidden="true">↑</span>
            </a>
          )}
        </footer>
      </main>
    </>
  );
}
