import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { Task, TaskPage } from "@vinext-laravel-starter/api-client";
import { afterEach, describe, expect, it, vi } from "vitest";

import TasksPage from "./page";

const realtime = vi.hoisted(() => ({ subscribed: undefined as (() => void) | undefined }));
vi.mock("@/lib/echo", () => ({
  getEcho: () => ({
    private: () => ({
      subscribed: (callback: () => void) => {
        realtime.subscribed = callback;
        return { listen: () => undefined };
      },
    }),
    leave: () => undefined,
  }),
  onEchoReconnected: () => () => undefined,
}));

const task: Task = {
  id: "01990000-0000-7000-8000-000000000001",
  input: "private task",
  state: "processing",
  version: 2,
  output: null,
  error_code: null,
  correlation_id: "01990000-0000-7000-8000-000000000002",
  created_at: "2026-09-19T00:00:00Z",
  started_at: "2026-09-19T00:00:00Z",
  finished_at: null,
};
const completed: Task = {
  ...task,
  state: "completed",
  version: 3,
  output: { word_count: 2, reversed: "ksat etavirp" },
  finished_at: "2026-09-19T00:00:01Z",
};
function response(tasks: Task[]): Response {
  return Response.json({
    data: tasks,
    meta: { next_cursor: null, prev_cursor: null },
  } satisfies TaskPage);
}
let client: QueryClient;
function mount() {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <TasksPage />
    </QueryClientProvider>,
  );
}
async function flush() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(100);
  });
}

afterEach(() => {
  cleanup();
  client?.clear();
  realtime.subscribed = undefined;
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("persisted Task state", () => {
  it("shows loading and a retryable error instead of claiming the list is empty", async () => {
    let reject!: (error: Error) => void;
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockImplementationOnce(
        () =>
          new Promise((_resolve, fail) => {
            reject = fail;
          }),
      )
      .mockResolvedValueOnce(response([]));
    vi.stubGlobal("fetch", fetchMock);
    mount();
    expect(screen.getByText("Loading tasks…")).toBeInTheDocument();
    expect(screen.queryByText(/No tasks yet/)).not.toBeInTheDocument();
    await act(async () => {
      reject(new Error("offline"));
    });
    expect(await screen.findByRole("alert")).toHaveTextContent("Tasks could not be loaded");
    expect(screen.queryByText(/No tasks yet/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText(/No tasks yet/)).toBeInTheDocument();
  });

  it("refetches after subscription to recover a completion missed before subscribing", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(response([task]))
        .mockResolvedValueOnce(response([completed])),
    );
    mount();
    expect(await screen.findByText("processing")).toBeInTheDocument();
    await act(async () => {
      realtime.subscribed?.();
    });
    expect(await screen.findByText("completed")).toBeInTheDocument();
  });

  it("polls active Tasks when no socket event arrives and stops once they finish", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(response([task]))
      .mockImplementation(async () => response([completed]));
    vi.stubGlobal("fetch", fetchMock);
    mount();
    await flush();
    expect(screen.getByText("processing")).toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_100);
    });
    expect(screen.getByText("completed")).toBeInTheDocument();
    const requestsAtCompletion = fetchMock.mock.calls.length;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(12_000);
    });
    expect(fetchMock).toHaveBeenCalledTimes(requestsAtCompletion);
  });
});
