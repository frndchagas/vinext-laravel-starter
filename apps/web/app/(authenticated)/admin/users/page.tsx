"use client";

import { keepPreviousData, useQueryClient } from "@tanstack/react-query";
import {
  getListAdminUsersQueryKey,
  type AdminUser,
  type AdminUserRole,
  useListAdminUsers,
  useUpdateAdminUserRole,
} from "@vinext-laravel-starter/api-client";
import { Search, UserCog, Users } from "lucide-react";
import { useState } from "react";

import { useAuthenticatedUser } from "@/components/authenticated-shell";
import { Initials } from "@/components/ds/avatar";
import { Card } from "@/components/ds/card";
import { type DataColumn, DataTable } from "@/components/ds/data-table";
import { EmptyState } from "@/components/ds/empty-state";
import { PageHeader } from "@/components/ds/page-header";
import { StatusPill } from "@/components/ds/pill";
import { RefreshRegion } from "@/components/ds/refresh-region";
import { StatusDot } from "@/components/ds/status-dot";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { problemDetail } from "@/lib/problem";

const PAGE_SIZE = 20;
const ROLE_LABELS: Record<AdminUserRole, string> = { admin: "Admin", member: "Member" };
const createdAtFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

function primaryRole(user: AdminUser): AdminUserRole {
  return user.roles.includes("admin") ? "admin" : "member";
}

function adminUserRole(value: string): AdminUserRole | undefined {
  if (value === "admin" || value === "member") return value;

  return undefined;
}

type RoleCellProps = {
  canManage: boolean;
  meId: string;
  onChange: (user: AdminUser, role: AdminUserRole) => void;
  pending: boolean;
  pendingUserId: string | undefined;
  user: AdminUser;
};

/** Native select so the row works on phones and in the e2e flow; the label names the person. */
function RoleCell({ canManage, meId, onChange, pending, pendingUserId, user }: RoleCellProps) {
  const ownAccount = user.id === meId;

  return (
    <span className="inline-flex items-center gap-2">
      <Label className="sr-only" htmlFor={`role-${user.id}`}>
        Role for {user.name}
      </Label>
      <select
        aria-busy={pending && pendingUserId === user.id}
        className="h-control rounded-lg border border-input bg-card px-3 text-body shadow-card outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={!canManage || ownAccount || pending}
        id={`role-${user.id}`}
        onChange={(event) => {
          const role = adminUserRole(event.target.value);
          if (role !== undefined) onChange(user, role);
        }}
        value={primaryRole(user)}
      >
        <option value="member">{ROLE_LABELS.member}</option>
        <option value="admin">{ROLE_LABELS.admin}</option>
      </select>
      {ownAccount ? <StatusPill dot>Current account</StatusPill> : null}
    </span>
  );
}

function userColumns({
  canManage,
  changeRole,
  meId,
  pending,
  pendingUserId,
}: {
  canManage: boolean;
  changeRole: (user: AdminUser, role: AdminUserRole) => void;
  meId: string;
  pending: boolean;
  pendingUserId: string | undefined;
}): ReadonlyArray<DataColumn<AdminUser>> {
  return [
    {
      cell: (user) => (
        <span className="flex items-center gap-2.5">
          <Initials name={user.name} size="sm" />
          <span className="min-w-0">
            <span className="block font-medium text-foreground">{user.name}</span>
            <span className="block text-caption text-muted-foreground">{user.email}</span>
          </span>
        </span>
      ),
      header: "User",
      key: "user",
    },
    {
      cell: (user) =>
        user.email_verified ? (
          <StatusDot tone="positive">Verified</StatusDot>
        ) : (
          <StatusDot tone="attention">Unverified</StatusDot>
        ),
      header: "Verification",
      key: "verification",
    },
    {
      cell: (user) => (
        <span className="text-muted-foreground tabular-nums">
          {createdAtFormat.format(new Date(user.created_at))}
        </span>
      ),
      header: "Created",
      hideOnMobile: true,
      key: "created",
    },
    {
      cell: (user) => (
        <RoleCell
          canManage={canManage}
          meId={meId}
          onChange={changeRole}
          pending={pending}
          pendingUserId={pendingUserId}
          user={user}
        />
      ),
      header: "Role",
      key: "role",
    },
  ];
}

export default function AdminUsersPage() {
  const me = useAuthenticatedUser();
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [cursor, setCursor] = useState<string>();
  const [message, setMessage] = useState<string>();
  // Searching or changing page changes the query key: the previous page dims until the new one arrives.
  const usersQuery = useListAdminUsers(
    {
      ...(cursor ? { cursor } : {}),
      per_page: PAGE_SIZE,
      ...(search ? { search } : {}),
    },
    { query: { placeholderData: keepPreviousData } },
  );
  const updating = usersQuery.isPlaceholderData;
  const roleMutation = useUpdateAdminUserRole();
  const canManage = me.permissions.includes("users.manage");
  const page = usersQuery.data?.status === 200 ? usersQuery.data.data : undefined;

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCursor(undefined);
    setSearch(searchInput.trim());
  }

  function changeRole(user: AdminUser, role: AdminUserRole) {
    if (role === primaryRole(user)) return;
    setMessage(undefined);

    roleMutation.mutate(
      { id: user.id, data: { role } },
      {
        onSuccess: async (response) => {
          if (response.status === 200) {
            setMessage(`${user.name} is now ${role}.`);
            await queryClient.invalidateQueries({ queryKey: getListAdminUsersQueryKey() });
            return;
          }

          setMessage(problemDetail(response.data, "The role could not be changed."));
        },
      },
    );
  }

  if (!me.permissions.includes("users.view")) {
    return (
      <Card aria-labelledby="users-forbidden-heading">
        <h1 className="text-title" id="users-forbidden-heading">
          User access required
        </h1>
        <p className="text-body text-muted-foreground">
          Laravel did not grant the users.view permission for this session.
        </p>
      </Card>
    );
  }

  const columns = userColumns({
    canManage,
    changeRole,
    meId: me.id,
    pending: roleMutation.isPending,
    pendingUserId: roleMutation.variables?.id,
  });

  return (
    <>
      <PageHeader icon={UserCog} title="Users" />
      <p className="-mt-2 max-w-2xl text-body text-pretty text-muted-foreground">
        Find users and manage their roles. Permissions stay decided by Laravel.
      </p>

      <search>
        <form className="flex max-w-xl items-end gap-2" onSubmit={submitSearch}>
          <div className="flex-1">
            <Label htmlFor="user-search">Search users</Label>
            <Input
              className="mt-2"
              id="user-search"
              name="search"
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Name or email"
              type="search"
              value={searchInput}
            />
          </div>
          <Button type="submit" variant="outline">
            <Search aria-hidden="true" />
            Search
          </Button>
        </form>
      </search>

      {message ? (
        <output
          aria-live="polite"
          className={
            roleMutation.data !== undefined && roleMutation.data.status !== 200
              ? "text-body text-negative"
              : "text-body text-positive"
          }
        >
          {message}
        </output>
      ) : null}

      {usersQuery.isPending ? (
        <output className="text-body text-muted-foreground">Loading users…</output>
      ) : usersQuery.isError ||
        (usersQuery.data !== undefined && usersQuery.data.status !== 200) ? (
        <Card aria-labelledby="users-unavailable-heading">
          <h2 className="text-heading" id="users-unavailable-heading">
            Users unavailable
          </h2>
          <p className="text-body text-muted-foreground">
            {usersQuery.data !== undefined
              ? problemDetail(usersQuery.data.data, "The user list could not be loaded.")
              : "The user list could not be loaded."}
          </p>
          <Button
            className="self-start"
            onClick={() => void usersQuery.refetch()}
            variant="outline"
          >
            Try again
          </Button>
        </Card>
      ) : page?.data.length === 0 ? (
        <EmptyState
          description="Try another name or email."
          icon={Users}
          title="No users match this search"
        />
      ) : (
        <RefreshRegion
          announcement={`${page?.data.length ?? 0} ${page?.data.length === 1 ? "user" : "users"} on this page`}
          busy={updating}
          className="rounded-card border border-border bg-card p-2 shadow-card"
        >
          <DataTable
            caption="Users and their assigned roles"
            columns={columns}
            rowKey={(user) => user.id}
            rows={page?.data ?? []}
          />
        </RefreshRegion>
      )}

      {page ? (
        <nav aria-label="User pages" className="flex items-center justify-between gap-4">
          <Button
            disabled={page.meta.prev_cursor === null || usersQuery.isFetching}
            onClick={() => setCursor(page.meta.prev_cursor ?? undefined)}
            variant="outline"
          >
            Previous
          </Button>
          <span className="text-label text-muted-foreground">Up to {PAGE_SIZE} users per page</span>
          <Button
            disabled={page.meta.next_cursor === null || usersQuery.isFetching}
            onClick={() => setCursor(page.meta.next_cursor ?? undefined)}
            variant="outline"
          >
            Next
          </Button>
        </nav>
      ) : null}
    </>
  );
}
