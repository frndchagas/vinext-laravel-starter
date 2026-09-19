# Asynchronous workflow

`Task` is the reference path for work that cannot finish inside one HTTP request. PostgreSQL remains the source of truth; Reverb only notifies the browser that state may have changed.

## Create once

`POST /api/v1/tasks` requires an `Idempotency-Key`. Laravel stores the validated input hash, response and Task identifier under a unique User, operation and key tuple.

Repeating the key with the same input returns the first response without dispatching another job. Reusing it with different input returns `409 idempotency_key_reused`.

The Task and idempotency record share a PostgreSQL transaction. Redis delivery runs only after the outer transaction commits, so rolling back leaves no Task or key. Redis is a separate system: if delivery fails after commit, the persisted Task remains `queued` and still represents work that is owed.

An idempotent replay attempts delivery again. The scheduler also reconciles queued Tasks after one minute and processing claims that remain unfinished beyond the complete retry window. PostgreSQL state is the recovery boundary; PostgreSQL and Redis still do not share one transaction.

## Process safely

`ProcessTask` has three attempts, a 120-second timeout and backoff delays of 10 and 60 seconds. Horizon uses a 125-second supervisor timeout, and Redis uses a 150-second `retry_after` value.

`ShouldBeUnique` reduces duplicate dispatches and expires its delivery lock after three minutes, but it is not the correctness boundary. Each serialized job carries a processing token. The atomic transition from `queued` to `processing` stores that token. A retry or reconciled stale claim with the same token may continue; another worker exits without completing or failing the Task.

External providers should receive an idempotency key derived from the Task identifier when they support one. The starter cannot promise exactly-once effects across a provider call and a process crash.

## Notify after persistence

`TaskStatusChanged` is dispatched after the processing, completed or failed state is persisted. The payload contains Task ID, state, version, occurrence time and correlation ID. There is no event for initial creation in the `queued` state.

The contracted Reverb channel is private. Laravel authorizes the owning verified User before Echo can subscribe.

WebSocket delivery has no end-to-end guarantee. A client may miss or receive duplicate notifications. The frontend therefore invalidates the Task list after an event, after a private channel subscription succeeds and when Echo reconnects. While the visible list contains queued or processing Tasks, it also refetches every three seconds in the foreground. Polling stops when all visible Tasks reach a final state. Loading and failed requests have separate states, and a failed list request offers a retry.

## Contracts and proofs

TypeSpec defines the HTTP resource and errors. AsyncAPI defines the observable Task channel and message. CI detects generated drift in both pipelines, and PHP tests compare the broadcast event with generated AsyncAPI metadata.

Tests currently prove:

- idempotent replay and conflicting reuse;
- rollback without persisted work or queued jobs;
- recovery after Redis rejects the first delivery attempt;
- reconciliation of queued work and stale processing claims;
- processing-token ownership and retry behavior;
- final states are not processed again;
- private-channel ownership and verified-email checks;
- browser recovery after a temporary connection loss or unavailable WebSocket delivery;
- completion between the initial response and channel subscription;
- isolation of cached Tasks when switching Users.

The suite does not claim a real operating-system timeout test or a stress test with parallel HTTP clients.
