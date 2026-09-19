"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  getListTasksQueryKey,
  useCreateTask,
  useListTasks,
  type Task,
} from "@vinext-laravel-starter/api-client";
import type { TaskStatusChangedPayload } from "@vinext-laravel-starter/realtime-contract";
import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getEcho, onEchoReconnected } from "@/lib/echo";
import { formValue } from "@/lib/form";
import { validationErrors } from "@/lib/problem";
import { useHydrated } from "@/lib/use-hydrated";

const STATE_STYLES: Record<Task["state"], string> = {
  queued: "bg-muted text-muted-foreground",
  processing: "bg-primary/15 text-primary",
  completed: "bg-primary text-primary-foreground",
  failed: "bg-destructive/10 text-destructive",
};

export default function TasksPage() {
  const queryClient = useQueryClient();
  const hydrated = useHydrated();
  const tasksQuery = useListTasks(undefined, {
    query: {
      refetchInterval: (query) => {
        const response = query.state.data;
        return response?.status === 200 &&
          response.data.data.some((task) => task.state === "queued" || task.state === "processing")
          ? 3_000
          : false;
      },
    },
  });
  const createMutation = useCreateTask();
  const formRef = useRef<HTMLFormElement>(null);

  const tasks = tasksQuery.data?.status === 200 ? tasksQuery.data.data.data : [];

  const activeIds = tasks
    .filter((task) => task.state === "queued" || task.state === "processing")
    .map((task) => task.id)
    .join(",");

  useEffect(() => {
    if (activeIds === "") {
      return undefined;
    }

    const echo = getEcho();
    const ids = activeIds.split(",");
    const stopListeningForReconnect = onEchoReconnected(() => {
      void queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
    });

    for (const id of ids) {
      echo
        .private(`tasks.${id}`)
        .subscribed(() => {
          void queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
        })
        .listen(".TaskStatusChanged", (event: TaskStatusChangedPayload) => {
          if (event.id === id) {
            void queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
          }
        });
    }

    return () => {
      stopListeningForReconnect();

      for (const id of ids) {
        echo.leave(`tasks.${id}`);
      }
    };
  }, [activeIds, queryClient]);

  const errors =
    createMutation.data?.status === 422 ? validationErrors(createMutation.data.data) : {};
  const listFailed =
    tasksQuery.isError || (tasksQuery.data !== undefined && tasksQuery.data.status !== 200);
  const createFailed =
    createMutation.isError ||
    (createMutation.data !== undefined && ![202, 422].includes(createMutation.data.status));

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);

    createMutation.mutate(
      {
        data: { input: formValue(form, "input") },
        headers: { "Idempotency-Key": crypto.randomUUID() },
      },
      {
        onSuccess: (response) => {
          if (response.status === 202) {
            formRef.current?.reset();
            void queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
          }
        },
      },
    );
  }

  return (
    <>
      <header className="border-b border-border pb-6">
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            Reference flow
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-app-display)] text-3xl text-foreground">
            Tasks
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Idempotent creation, queued processing and live state over the private channel.
          </p>
        </div>
      </header>

      <form
        ref={formRef}
        onSubmit={submit}
        className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5"
      >
        <Label htmlFor="input">New task input</Label>
        <div className="flex gap-2">
          <Input
            id="input"
            name="input"
            required
            placeholder="Type any text; the worker counts and reverses it"
            aria-invalid={errors["input"] !== undefined || undefined}
          />
          <Button type="submit" disabled={!hydrated || createMutation.isPending}>
            {createMutation.isPending ? "Queueing…" : "Queue task"}
          </Button>
        </div>
        {errors["input"] !== undefined ? (
          <p role="alert" className="text-sm text-destructive">
            {errors["input"][0]}
          </p>
        ) : null}
        {createFailed ? (
          <p role="alert" className="text-sm text-destructive">
            The task could not be queued. Check your connection and try again.
          </p>
        ) : null}
      </form>

      <section className="flex flex-col gap-3" aria-label="Tasks">
        {tasksQuery.isPending ? <output>Loading tasks…</output> : null}
        {listFailed ? (
          <div role="alert" className="flex items-center gap-3 text-sm text-destructive">
            <p>Tasks could not be loaded. Try again.</p>
            <Button
              variant="outline"
              disabled={tasksQuery.isFetching}
              onClick={() => void tasksQuery.refetch()}
            >
              Try again
            </Button>
          </div>
        ) : null}
        {!tasksQuery.isPending && !listFailed && tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No tasks yet. Queue one to watch it move through queued, processing and completed.
          </p>
        ) : null}
        {tasks.map((task) => (
          <article key={task.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="truncate text-sm text-foreground">{task.input}</p>
              <span
                className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide uppercase ${STATE_STYLES[task.state]}`}
              >
                {task.state}
              </span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              v{task.version} · {task.id}
            </p>
            {task.state === "completed" && task.output !== null ? (
              <p className="mt-2 text-sm text-muted-foreground">
                {task.output.word_count} words · reversed: “{task.output.reversed}”
              </p>
            ) : null}
            {task.state === "failed" ? (
              <p className="mt-2 text-sm text-destructive">Failed with code {task.error_code}.</p>
            ) : null}
          </article>
        ))}
      </section>
    </>
  );
}
