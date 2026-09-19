import { QueryClient, QueryObserver } from "@tanstack/react-query";
import {
  getGetMeQueryKey,
  getListTasksQueryKey,
  getGetRecoveryCodesQueryKey,
} from "@vinext-laravel-starter/api-client";
import { describe, expect, it, vi } from "vitest";

import { disconnectEcho } from "./echo";
import { clearSession } from "./session";

vi.mock("./echo", () => ({ disconnectEcho: vi.fn<() => void>() }));

describe("session boundaries", () => {
  it("removes private queries and mutation results before another User can observe them", async () => {
    const client = new QueryClient();
    client.setQueryData(getGetMeQueryKey(), { id: "user-a" });
    client.setQueryData(getListTasksQueryKey(), { data: [{ input: "user-a-private-task" }] });
    client.setQueryData(getGetRecoveryCodesQueryKey(), ["user-a-recovery-code"]);
    await client
      .getMutationCache()
      .build(client, { mutationFn: async () => "private-result" })
      .execute(undefined);

    await clearSession(client);

    expect(disconnectEcho).toHaveBeenCalled();
    expect(client.getQueryCache().getAll()).toHaveLength(0);
    expect(client.getMutationCache().getAll()).toHaveLength(0);
    const nextSession = new QueryObserver(client, { queryKey: getListTasksQueryKey() });
    expect(nextSession.getCurrentResult().data).toBeUndefined();
    client.clear();
  });

  it("cancels pending requests so a late result cannot repopulate the next session", async () => {
    const client = new QueryClient();
    let complete!: (data: string) => void;
    let requestSignal!: AbortSignal;
    const pending = client
      .fetchQuery({
        queryKey: getListTasksQueryKey(),
        queryFn: ({ signal }) => {
          requestSignal = signal;
          return new Promise<string>((resolve) => {
            complete = resolve;
          });
        },
      })
      .catch(() => undefined);

    await clearSession(client);
    client.setQueryData(getListTasksQueryKey(), "user-b-data");
    complete("user-a-data");
    await pending;

    expect(requestSignal.aborted).toBe(true);
    expect(client.getQueryData(getListTasksQueryKey())).toBe("user-b-data");
    client.clear();
  });
});
