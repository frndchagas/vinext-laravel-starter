"use client";

import { useQueryClient } from "@tanstack/react-query";
import { getGetMeQueryKey, type Me, useGetMe, useLogout } from "@vinext-laravel-starter/api-client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { disconnectEcho } from "@/lib/echo";
import { cn } from "@/lib/utils";

const AuthenticatedUserContext = createContext<Me | undefined>(undefined);

const primaryNavigation = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/tasks", label: "Tasks" },
  { href: "/settings", label: "Settings" },
] as const;

export function useAuthenticatedUser(): Me {
  const me = useContext(AuthenticatedUserContext);

  if (me === undefined) {
    throw new Error("useAuthenticatedUser must be used inside AuthenticatedShell.");
  }

  return me;
}

export function AuthenticatedShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const meQuery = useGetMe();
  const logoutMutation = useLogout();
  const me = meQuery.data?.status === 200 ? meQuery.data.data : undefined;

  useEffect(() => {
    if (meQuery.data?.status === 401) {
      router.replace("/login");
    } else if (me !== undefined && !me.email_verified) {
      router.replace("/verify-email");
    }
  }, [me, meQuery.data?.status, router]);

  function signOut() {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        disconnectEcho();
        queryClient.removeQueries({ queryKey: getGetMeQueryKey() });
        router.push("/login");
      },
    });
  }

  if (me === undefined) {
    const failed = meQuery.isError || (meQuery.data !== undefined && meQuery.data.status !== 401);

    return (
      <main className="flex min-h-dvh items-center justify-center bg-background px-6">
        {failed ? (
          <div className="max-w-sm text-center">
            <h1 className="font-[family-name:var(--font-app-display)] text-2xl">
              Session unavailable
            </h1>
            <p className="mt-2 text-sm text-pretty text-muted-foreground">
              Laravel could not confirm your session. Check the API connection and try again.
            </p>
            <Button className="mt-5" onClick={() => void meQuery.refetch()} variant="outline">
              Try again
            </Button>
          </div>
        ) : (
          <output className="text-sm text-muted-foreground">Loading session…</output>
        )}
      </main>
    );
  }

  const navigation = me.permissions.includes("users.view")
    ? [...primaryNavigation, { href: "/admin/users", label: "Users" }]
    : primaryNavigation;

  return (
    <AuthenticatedUserContext value={me}>
      <div className="min-h-dvh bg-background">
        <a
          className="sr-only z-50 rounded-lg bg-background px-3 py-2 text-sm font-medium focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:ring-3 focus:ring-ring/50"
          href="#main-content"
        >
          Skip to content
        </a>
        <header className="border-b border-border bg-background/95">
          <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-6 py-4">
            <Link
              className="font-[family-name:var(--font-app-display)] text-xl text-foreground"
              href="/dashboard"
            >
              Vinext Laravel Starter
            </Link>
            <nav
              aria-label="Primary"
              className="order-3 flex w-full gap-1 overflow-x-auto sm:order-2 sm:w-auto"
            >
              {navigation.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

                return (
                  <Link
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                      active ? "bg-muted text-foreground transition-none" : "text-muted-foreground",
                    )}
                    href={item.href}
                    key={item.href}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="order-2 flex items-center gap-3 sm:order-3">
              <div className="hidden text-right md:block">
                <p className="max-w-44 truncate text-sm font-medium">{me.name}</p>
                <p className="max-w-44 truncate text-xs text-muted-foreground">{me.email}</p>
              </div>
              <Button variant="outline" disabled={logoutMutation.isPending} onClick={signOut}>
                {logoutMutation.isPending ? "Signing out…" : "Sign out"}
              </Button>
            </div>
          </div>
        </header>
        <main id="main-content" className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
          {children}
        </main>
      </div>
    </AuthenticatedUserContext>
  );
}
