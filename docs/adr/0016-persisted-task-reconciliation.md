# ADR 0016: persisted Task reconciliation

Status: superseded by [ADR 0017](0017-remove-task-example.md).
Implementation: removed with the Tasks example. The rationale below records the previous behavior.

A non-final Task is the durable record of work still owed. Redis delivery after commit is an immediate attempt, while a scheduled reconciler redispatches queued Tasks and stale processing claims until they reach a final state. Idempotent jobs and processing tokens make repeated delivery safe.

A separate transactional outbox was rejected for the single reference flow because Task already records the required intent and state. This decision must be revisited if one domain operation needs to publish multiple independent commands or integration events.
