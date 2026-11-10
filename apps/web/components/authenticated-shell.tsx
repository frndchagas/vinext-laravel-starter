"use client";

import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { useQueryClient } from "@tanstack/react-query";
import { type Me, useGetMe, useLogout } from "@vinext-laravel-starter/api-client";
import {
  Ellipsis,
  LayoutDashboard,
  LogOut,
  Menu,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { BrandMark, Wordmark } from "@/components/brand";
import { Initials } from "@/components/ds/avatar";
import { POPUP_CLASS } from "@/components/ds/popup";
import { Skeleton } from "@/components/ds/skeleton";
import { Hint, HintTrigger } from "@/components/navigation/hint";
import {
  iconClass,
  NavPendingIndicator,
  NavRow,
  SidebarSection,
} from "@/components/navigation/sidebar-parts";
import { useStoredFlag } from "@/components/navigation/stored-flag";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { clearSession } from "@/lib/session";
import { cn } from "@/lib/utils";

const AuthenticatedUserContext = createContext<Me | undefined>(undefined);

/**
 * Menu item a page marks as active when the route alone does not say which section it belongs to
 * (a detail page under another path that still belongs to a sidebar item).
 */
const NavigationHighlightContext = createContext<((href: string | undefined) => void) | undefined>(
  undefined,
);

export type NavigationItem = {
  href: string;
  icon: LucideIcon;
  label: string;
  /** Permission from `Me.permissions` that the item requires; without one, everybody sees it. */
  permission?: string;
};

export type NavigationSection = {
  items: ReadonlyArray<NavigationItem>;
  title: string;
};

/**
 * Sidebar sections. Add a product's screens to "General"; items with `permission` only show up for
 * users who hold it. "Developer" carries the design-system showcase; drop it in a product build.
 */
export const NAVIGATION_SECTIONS: ReadonlyArray<NavigationSection> = [
  {
    items: [
      { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
      { href: "/settings", icon: Settings, label: "Settings" },
    ],
    title: "General",
  },
  {
    items: [{ href: "/admin/users", icon: ShieldCheck, label: "Users", permission: "users.view" }],
    title: "Admin",
  },
  {
    items: [{ href: "/design-system", icon: Palette, label: "Design system" }],
    title: "Developer",
  },
];

/** The avatar menu keeps the account: Settings and Sign out. */
const ACCOUNT_ITEMS: ReadonlyArray<NavigationItem> = [
  { href: "/settings", icon: Settings, label: "Settings" },
];

const COLLAPSED_STORAGE_KEY = "nav-collapsed";

export function useAuthenticatedUser(): Me {
  const me = useContext(AuthenticatedUserContext);

  if (me === undefined) {
    throw new Error("useAuthenticatedUser must be used inside AuthenticatedShell.");
  }

  return me;
}

function isActive(pathname: string, href: string): boolean {
  const path = href.split("?")[0] ?? href;
  return path === "/" ? pathname === "/" : pathname === path || pathname.startsWith(`${path}/`);
}

/**
 * Marks a menu item as active while the page is mounted, for routes that do not sit under the item.
 * Accepts an href with a query; only the path counts. Outside the shell, it does nothing.
 */
export function useNavigationHighlight(href: string | undefined): void {
  const highlight = useContext(NavigationHighlightContext);
  const path = href?.split("?")[0];

  useEffect(() => {
    if (highlight === undefined || path === undefined) return undefined;
    highlight(path);
    return () => highlight(undefined);
  }, [highlight, path]);
}

/** Sections the user can see: those with at least one item they hold the permission for. */
function visibleSections(me: Me | undefined): ReadonlyArray<NavigationSection> {
  const sections: NavigationSection[] = [];
  for (const section of NAVIGATION_SECTIONS) {
    const items = section.items.filter(
      (item) => item.permission === undefined || me?.permissions.includes(item.permission) === true,
    );
    if (items.length > 0) sections.push({ items, title: section.title });
  }
  return sections;
}

/**
 * Top of the sidebar: mark and product name, a link to the dashboard. Collapsed, the mark alone with
 * the name as a hint.
 */
function SidebarBrand({ collapsed, siteName }: { collapsed: boolean; siteName: string }) {
  if (collapsed) {
    return (
      <Hint content={siteName} side="right">
        <HintTrigger
          aria-label={`${siteName}: go to the dashboard`}
          className="mx-auto grid size-9 place-items-center rounded-lg outline-none hover:bg-sidebar-accent focus-visible:ring-3 focus-visible:ring-ring/50"
          render={<Link href="/dashboard" />}
        >
          <BrandMark className="size-5" />
        </HintTrigger>
      </Hint>
    );
  }

  return (
    <Wordmark
      className="h-9 min-w-0 flex-1 px-2 hover:bg-sidebar-accent"
      href="/dashboard"
      name={siteName}
    />
  );
}

function CollapseButton({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const label = collapsed ? "Expand menu" : "Collapse menu";
  const Icon = collapsed ? PanelLeftOpen : PanelLeftClose;
  const className =
    "grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground outline-none hover:bg-sidebar-accent hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50";

  return (
    <Hint content={label} side={collapsed ? "right" : "bottom"}>
      <HintTrigger
        aria-label={label}
        className={cn(className, collapsed && "mx-auto size-9")}
        onClick={onToggle}
      >
        <Icon aria-hidden="true" className="size-4" strokeWidth={1.75} />
      </HintTrigger>
    </Hint>
  );
}

function ItemLink({
  collapsed,
  highlighted,
  item,
  onNavigate,
  pathname,
}: {
  collapsed: boolean;
  highlighted?: string | undefined;
  item: NavigationItem;
  onNavigate?: (() => void) | undefined;
  pathname: string;
}) {
  const active = isActive(pathname, item.href) || highlighted === item.href;
  const Icon = item.icon;

  return (
    <NavRow
      active={active}
      collapsed={collapsed}
      href={item.href}
      label={item.label}
      leading={<Icon aria-hidden="true" className={iconClass} strokeWidth={1.75} />}
      onNavigate={onNavigate}
      tooltip={item.label}
    />
  );
}

function Sections({
  collapsed,
  highlighted,
  onNavigate,
  pathname,
  sections,
}: {
  collapsed: boolean;
  highlighted?: string | undefined;
  onNavigate?: (() => void) | undefined;
  pathname: string;
  sections: ReadonlyArray<NavigationSection>;
}) {
  return (
    <>
      {sections.map((section) => (
        <SidebarSection collapsed={collapsed} key={section.title} title={section.title}>
          {section.items.map((item) => (
            <li key={item.href}>
              <ItemLink
                collapsed={collapsed}
                highlighted={highlighted}
                item={item}
                onNavigate={onNavigate}
                pathname={pathname}
              />
            </li>
          ))}
        </SidebarSection>
      ))}
    </>
  );
}

function navClass(collapsed: boolean): string {
  return cn(
    "-mx-1 flex min-h-0 flex-1 scrollbar-hover flex-col overflow-y-auto px-1 py-0.5",
    collapsed ? "gap-2" : "gap-3",
  );
}

/** User card in the footer: opens the menu with Settings and Sign out. Collapsed, initials only. */
function AccountMenu({
  collapsed,
  me,
  onNavigate,
  pathname,
  signingOut,
  signOut,
}: {
  collapsed: boolean;
  me: Me;
  onNavigate?: (() => void) | undefined;
  pathname: string;
  signingOut: boolean;
  signOut: () => void;
}) {
  const here = ACCOUNT_ITEMS.find((item) => isActive(pathname, item.href));
  // The current page's item gets the same highlight as the active sidebar item (background, weight).
  const itemClass =
    "flex cursor-default items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-body outline-none select-none data-disabled:opacity-50 data-highlighted:bg-muted aria-[current=page]:bg-sidebar-accent aria-[current=page]:font-medium aria-[current=page]:text-foreground";
  const label =
    here === undefined
      ? `Account: ${me.name}. Open menu`
      : `Account: ${me.name}, on ${here.label}. Open menu`;

  const trigger = (
    <MenuPrimitive.Trigger
      aria-label={label}
      className={cn(
        "flex items-center rounded-lg text-left outline-none hover:bg-sidebar-accent focus-visible:ring-3 focus-visible:ring-ring/50 data-popup-open:bg-sidebar-accent",
        collapsed ? "mx-auto size-9 justify-center" : "w-full gap-2.5 p-1.5",
      )}
    >
      <Initials className="size-7" name={me.name} />
      {collapsed ? null : (
        <>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-body font-medium">{me.name}</span>
            <span className="block truncate text-caption text-muted-foreground">{me.email}</span>
          </span>
          <Ellipsis aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
        </>
      )}
    </MenuPrimitive.Trigger>
  );

  return (
    <MenuPrimitive.Root>
      {collapsed ? (
        <Hint content={me.name} side="right">
          <HintTrigger render={trigger} />
        </Hint>
      ) : (
        trigger
      )}
      <MenuPrimitive.Portal>
        <MenuPrimitive.Positioner
          align="start"
          className="z-50"
          side={collapsed ? "right" : "top"}
          sideOffset={6}
        >
          <MenuPrimitive.Popup className={cn(POPUP_CLASS, "w-56 p-1")}>
            {ACCOUNT_ITEMS.map((item) => {
              const current = isActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <MenuPrimitive.LinkItem
                  aria-current={current ? "page" : undefined}
                  className={itemClass}
                  closeOnClick
                  key={item.href}
                  {...(onNavigate !== undefined ? { onClick: onNavigate } : {})}
                  render={<Link href={item.href} />}
                >
                  <Icon aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.75} />
                  {item.label}
                </MenuPrimitive.LinkItem>
              );
            })}
            <MenuPrimitive.Separator className="my-1 h-px bg-border" />
            <MenuPrimitive.Item className={itemClass} disabled={signingOut} onClick={signOut}>
              <LogOut aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.75} />
              {signingOut ? "Signing out…" : "Sign out"}
            </MenuPrimitive.Item>
          </MenuPrimitive.Popup>
        </MenuPrimitive.Positioner>
      </MenuPrimitive.Portal>
    </MenuPrimitive.Root>
  );
}

function SidebarContent({
  collapsed,
  drawer = false,
  highlighted,
  me,
  onNavigate,
  onToggleCollapsed,
  pathname,
  signingOut,
  signOut,
  siteName,
}: {
  collapsed: boolean;
  /** In the phone drawer, the top leaves room for the drawer's "Close". */
  drawer?: boolean;
  highlighted: string | undefined;
  me: Me;
  onNavigate?: (() => void) | undefined;
  onToggleCollapsed?: (() => void) | undefined;
  pathname: string;
  signingOut: boolean;
  signOut: () => void;
  siteName: string;
}) {
  return (
    <>
      <div
        className={cn(
          "flex gap-1",
          collapsed ? "flex-col items-center" : "items-center",
          drawer && "pr-10",
        )}
      >
        <SidebarBrand collapsed={collapsed} siteName={siteName} />
        {onToggleCollapsed === undefined ? null : (
          <CollapseButton collapsed={collapsed} onToggle={onToggleCollapsed} />
        )}
      </div>

      <nav aria-label="Primary" className={navClass(collapsed)}>
        <Sections
          collapsed={collapsed}
          highlighted={highlighted}
          onNavigate={onNavigate}
          pathname={pathname}
          sections={visibleSections(me)}
        />
      </nav>

      <div className="border-t border-sidebar-border pt-2">
        <AccountMenu
          collapsed={collapsed}
          me={me}
          onNavigate={onNavigate}
          pathname={pathname}
          signOut={signOut}
          signingOut={signingOut}
        />
      </div>
    </>
  );
}

/** Widths of the open menu (256 px) and of the collapsed icon rail (56 px), and the content offset. */
const SIDEBAR_WIDTH = { collapsed: "w-14", open: "w-64" } as const;
const CONTENT_OFFSET = { collapsed: "lg:pl-14", open: "lg:pl-64" } as const;

/**
 * Sidebar background the height of the whole document, behind the fixed `aside`. On screen the
 * `aside` (fixed, window height) is enough; in a full-page capture the browser draws fixed elements
 * only at the window height and the sidebar background would stop mid-page.
 */
function SidebarBackdrop({ collapsed }: { collapsed: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-y-0 left-0 z-20 hidden border-r border-sidebar-border bg-sidebar lg:block",
        SIDEBAR_WIDTH[collapsed ? "collapsed" : "open"],
      )}
      data-sidebar-backdrop=""
    />
  );
}

function asideClass(collapsed: boolean): string {
  return cn(
    "fixed inset-y-0 left-0 z-30 hidden flex-col gap-3 border-r border-sidebar-border bg-sidebar py-3 motion-safe:transition-[width] motion-safe:duration-200 lg:flex",
    collapsed ? "px-2" : "px-3",
    SIDEBAR_WIDTH[collapsed ? "collapsed" : "open"],
  );
}

const MAIN_CLASS =
  "mx-auto flex w-full max-w-[1320px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-page lg:py-8";

/**
 * While Laravel confirms the session: the real app frame (brand, menu with the real links and the
 * body in skeleton) instead of a blank screen with "Loading session…". The menu already works; what
 * depends on the user (permission-gated items, account) shows as skeleton.
 */
function ShellSkeleton({ pathname, siteName }: { pathname: string; siteName: string }) {
  const [collapsed] = useStoredFlag(COLLAPSED_STORAGE_KEY, false);

  return (
    <div className="relative min-h-dvh bg-background" data-shell="loading">
      <SidebarBackdrop collapsed={collapsed} />
      <aside className={asideClass(collapsed)}>
        <div className={cn("flex h-9 items-center gap-2", collapsed ? "justify-center" : "px-2")}>
          <BrandMark className={collapsed ? "size-5" : "size-6"} />
          {collapsed ? null : <Skeleton className="h-3.5 w-28" />}
        </div>
        <nav aria-label="Primary" className={navClass(collapsed)}>
          <Sections
            collapsed={collapsed}
            pathname={pathname}
            sections={visibleSections(undefined)}
          />
        </nav>
        <div className="flex items-center gap-2.5 border-t border-sidebar-border px-1.5 pt-3">
          <Skeleton className="size-7 rounded-full" />
          {collapsed ? null : (
            <span className="flex flex-1 flex-col gap-1.5">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-2.5 w-36" />
            </span>
          )}
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-sidebar/95 px-4 py-3 backdrop-blur lg:hidden">
        <Wordmark href="/dashboard" name={siteName} />
        <Skeleton className="h-9 w-20 rounded-lg" />
      </header>

      <div
        className={cn(
          CONTENT_OFFSET[collapsed ? "collapsed" : "open"],
          "motion-safe:transition-[padding] motion-safe:duration-200",
        )}
      >
        <main aria-busy="true" className={MAIN_CLASS} id="main-content">
          <output className="sr-only">Loading session</output>
          <div className="flex flex-col gap-2">
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-4 w-80 max-w-full" />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Skeleton className="h-24 rounded-card" />
            <Skeleton className="h-24 rounded-card" />
            <Skeleton className="h-24 rounded-card" />
          </div>
          <div className="flex flex-col gap-2 rounded-card border border-border bg-card p-4 shadow-card">
            {Array.from({ length: 8 }, (_, index) => (
              <Skeleton className="h-9" key={index} />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

export function AuthenticatedShell({
  children,
  siteName,
}: {
  children: ReactNode;
  /** Product name from `lib/site-config.ts`, passed by the server layout. */
  siteName: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const meQuery = useGetMe();
  const logoutMutation = useLogout();
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useStoredFlag(COLLAPSED_STORAGE_KEY, false);
  const [highlighted, setHighlighted] = useState<string | undefined>(undefined);
  const me = meQuery.data?.status === 200 ? meQuery.data.data : undefined;

  useEffect(() => {
    if (meQuery.data?.status === 401) {
      void clearSession(queryClient).then(() => router.replace("/login"));
    } else if (me !== undefined && !me.email_verified) {
      router.replace("/verify-email");
    }
  }, [me, meQuery.data?.status, queryClient, router]);

  async function signOut() {
    // Cancel in-flight reads before the logout: a response landing after it would carry the old
    // session cookie and leave the user signed in again.
    await queryClient.cancelQueries();
    logoutMutation.mutate(undefined, {
      onSuccess: async () => {
        await clearSession(queryClient);
        router.push("/login");
      },
    });
  }

  if (me === undefined) {
    const failed = meQuery.isError || (meQuery.data !== undefined && meQuery.data.status !== 401);

    if (!failed) {
      return <ShellSkeleton pathname={pathname} siteName={siteName} />;
    }

    return (
      <main className="flex min-h-dvh items-center justify-center bg-background px-6">
        <div className="max-w-sm text-center">
          <h1 className="text-title">Session unavailable</h1>
          <p className="mt-2 text-body text-pretty text-muted-foreground">
            Laravel could not confirm your session. Check the API connection and try again.
          </p>
          <Button
            className="mt-5"
            onClick={() => void meQuery.refetch()}
            pending={meQuery.isFetching}
            pendingLabel="Trying…"
            variant="outline"
          >
            Try again
          </Button>
        </div>
      </main>
    );
  }

  const sidebarProps = {
    highlighted,
    me,
    pathname,
    signOut,
    signingOut: logoutMutation.isPending,
    siteName,
  };

  return (
    <AuthenticatedUserContext value={me}>
      <NavigationHighlightContext value={setHighlighted}>
        <div className="relative min-h-dvh bg-background">
          <a
            className="sr-only z-50 rounded-lg bg-card px-3 py-2 text-body font-medium focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:ring-3 focus:ring-ring/50"
            href="#main-content"
          >
            Skip to content
          </a>

          <SidebarBackdrop collapsed={collapsed} />
          <aside className={asideClass(collapsed)} data-collapsed={collapsed ? "" : undefined}>
            <SidebarContent
              {...sidebarProps}
              collapsed={collapsed}
              onToggleCollapsed={() => setCollapsed(!collapsed)}
            />
          </aside>

          <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-sidebar/95 px-4 py-3 backdrop-blur lg:hidden">
            <Wordmark href="/dashboard" name={siteName}>
              <NavPendingIndicator />
            </Wordmark>
            <Button onClick={() => setMenuOpen(true)} variant="outline">
              <Menu aria-hidden="true" />
              Menu
            </Button>
          </header>

          <Sheet onOpenChange={setMenuOpen} open={menuOpen}>
            {/* The menu stays a drawer (304 px, with the page visible beside it to tap and close). */}
            <SheetContent
              className="gap-0 bg-sidebar p-0 data-[side=left]:w-76 data-[side=left]:max-w-[85vw]"
              side="left"
            >
              <SheetHeader className="sr-only">
                <SheetTitle>{siteName} menu</SheetTitle>
                <SheetDescription>Navigation and account</SheetDescription>
              </SheetHeader>
              <div className="flex min-h-0 flex-1 flex-col gap-3 p-3">
                <SidebarContent
                  {...sidebarProps}
                  collapsed={false}
                  drawer
                  onNavigate={() => setMenuOpen(false)}
                />
              </div>
            </SheetContent>
          </Sheet>

          <div
            className={cn(
              CONTENT_OFFSET[collapsed ? "collapsed" : "open"],
              "motion-safe:transition-[padding] motion-safe:duration-200",
            )}
          >
            <main className={MAIN_CLASS} id="main-content">
              {children}
            </main>
          </div>
        </div>
      </NavigationHighlightContext>
    </AuthenticatedUserContext>
  );
}
