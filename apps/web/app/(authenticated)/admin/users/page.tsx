"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  getListAdminUsersQueryKey,
  type AdminUser,
  type AdminUserRole,
  useListAdminUsers,
  useUpdateAdminUserRole,
} from "@vinext-laravel-starter/api-client";
import { useState } from "react";

import { useAuthenticatedUser } from "@/components/authenticated-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { problemDetail } from "@/lib/problem";

const PAGE_SIZE = 20;

function primaryRole(user: AdminUser): AdminUserRole {
  return user.roles.includes("admin") ? "admin" : "member";
}

function adminUserRole(value: string): AdminUserRole | undefined {
  if (value === "admin" || value === "member") return value;

  return undefined;
}

export default function AdminUsersPage() {
  const me = useAuthenticatedUser();
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [cursor, setCursor] = useState<string>();
  const [message, setMessage] = useState<string>();
  const usersQuery = useListAdminUsers({
    ...(cursor ? { cursor } : {}),
    per_page: PAGE_SIZE,
    ...(search ? { search } : {}),
  });
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
      <section aria-labelledby="users-forbidden-heading" className="rounded-xl border p-6">
        <h1
          id="users-forbidden-heading"
          className="font-[family-name:var(--font-app-display)] text-3xl"
        >
          User access required
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Laravel did not grant the users.view permission for this session.
        </p>
      </section>
    );
  }

  return (
    <>
      <header className="border-b border-border pb-6">
        <h1 className="font-[family-name:var(--font-app-display)] text-4xl text-balance">Users</h1>
        <p className="mt-2 max-w-2xl text-sm text-pretty text-muted-foreground">
          Find users and manage their roles.
        </p>
      </header>

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
          <Button type="submit">Search</Button>
        </form>
      </search>

      {message ? (
        <output
          aria-live="polite"
          className={
            roleMutation.data !== undefined && roleMutation.data.status !== 200
              ? "text-sm text-destructive"
              : "text-sm text-primary"
          }
        >
          {message}
        </output>
      ) : null}

      {usersQuery.isPending ? (
        <output className="text-sm text-muted-foreground">Loading users…</output>
      ) : usersQuery.isError ||
        (usersQuery.data !== undefined && usersQuery.data.status !== 200) ? (
        <div className="rounded-xl border border-destructive/30 p-5">
          <h2 className="font-semibold">Users unavailable</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {usersQuery.data !== undefined
              ? problemDetail(usersQuery.data.data, "The user list could not be loaded.")
              : "The user list could not be loaded."}
          </p>
          <Button className="mt-4" onClick={() => void usersQuery.refetch()} variant="outline">
            Try again
          </Button>
        </div>
      ) : page?.data.length === 0 ? (
        <p className="rounded-xl border border-border p-5 text-sm text-muted-foreground">
          No users match this search.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-2xl border-collapse text-left text-sm">
            <caption className="sr-only">Users and their assigned roles</caption>
            <thead className="bg-muted/60 text-xs tracking-wide text-muted-foreground uppercase">
              <tr>
                <th className="px-4 py-3 font-semibold" scope="col">
                  User
                </th>
                <th className="px-4 py-3 font-semibold" scope="col">
                  Verification
                </th>
                <th className="px-4 py-3 font-semibold" scope="col">
                  Created
                </th>
                <th className="px-4 py-3 font-semibold" scope="col">
                  Role
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {page?.data.map((user) => {
                const ownAccount = user.id === me.id;

                return (
                  <tr key={user.id}>
                    <th className="px-4 py-3 font-normal" scope="row">
                      <span className="block font-medium text-foreground">{user.name}</span>
                      <span className="block text-xs text-muted-foreground">{user.email}</span>
                    </th>
                    <td className="px-4 py-3 text-muted-foreground">
                      {user.email_verified ? "Verified" : "Unverified"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                      {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
                        new Date(user.created_at),
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Label className="sr-only" htmlFor={`role-${user.id}`}>
                        Role for {user.name}
                      </Label>
                      <select
                        className="h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={!canManage || ownAccount || roleMutation.isPending}
                        id={`role-${user.id}`}
                        onChange={(event) => {
                          const role = adminUserRole(event.target.value);
                          if (role !== undefined) changeRole(user, role);
                        }}
                        value={primaryRole(user)}
                      >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                      </select>
                      {ownAccount ? (
                        <span className="ml-2 text-xs text-muted-foreground">Current account</span>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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
          <span className="text-xs text-muted-foreground">Up to {PAGE_SIZE} users per page</span>
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
