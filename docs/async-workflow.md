# Queues and realtime

Redis, Horizon and Reverb are configured for application features. The core includes no example domain resource, background job or application event. The dashboard subscribes to the verified User's private channel to prove session-based authorization and connectivity.

## Add background work

Start with the application's domain model and HTTP contract. Persist durable state in Laravel, dispatch jobs after the surrounding transaction commits and make retries safe. Choose timeouts, retry limits and a recovery path for that operation.

Horizon uses a 125-second supervisor timeout and Redis uses a 150-second `retry_after` value. Keep a job's timeout below both limits. The scheduler records Horizon metrics every five minutes and prunes failed jobs after seven days.

For mutations that can be retried, define idempotency around the actual operation. The core provides no idempotency table or replay service. The starter cannot promise exactly-once effects across a provider call and a process crash.

## Add realtime messages

Define public HTTP resources in TypeSpec and observable messages in AsyncAPI, then run `bun run contracts:build`. The current AsyncAPI contract records `private-users.{userId}` as a connectivity channel with no application messages.

Broadcast only after persisted state commits. Laravel must authorize each private channel. Add PHP conformance tests for new events and browser coverage for their delivery and recovery behavior.

WebSocket delivery can be duplicated or lost. Consumers must rebuild current state through the HTTP API after a reconnection and provide a recovery path when realtime delivery is unavailable. PostgreSQL remains the source of truth.

## Existing installations

The example Tasks vertical has been removed. See [deployment](deployment.md#removing-the-tasks-example-from-an-existing-database) before applying its removal migration to an existing database.
