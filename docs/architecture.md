# Architecture

## Current topology

The browser uses one origin published by Caddy:

```text
browser -> Caddy
             ├── /                         -> Vinext on Node
             ├── /api/*, /sanctum/*, /up, /ready -> Laravel
             └── /ws/*                    -> Reverb, with /ws stripped

Laravel -> PostgreSQL
Laravel -> Redis / Horizon
```

Vinext owns presentation routes and user experience. Laravel owns identity, authorization, persistence, queues and events. Relative browser URLs keep internal service ports out of frontend code and avoid a cross-origin cookie setup.

Local development runs Caddy, PostgreSQL, Redis and Mailpit in Docker. Vinext, Laravel, Horizon and Reverb run as host processes through `bun run dev`.

Production builds separate images for Caddy, Vinext, Nginx and PHP-FPM. The PHP image is reused by the API, Horizon, scheduler, migration and Reverb services. PostgreSQL and Redis use named volumes. CI starts the complete topology, verifies authenticated navigation and private Reverb connectivity, and tests a PostgreSQL backup and restore.

## Boundaries

- TypeSpec is the source for application HTTP consumed through the generated client.
- AsyncAPI generates frontend message types and PHP conformance metadata from the same payload schema.
- Sanctum CSRF and Echo broadcasting authorization remain protocol infrastructure. The session fetcher invokes the contracted CSRF endpoint, while Echo owns broadcasting authorization.
- PostgreSQL state wins over any realtime notification.
- Roles and permissions authorize User administration through Laravel.
- Queue and realtime infrastructure is available; application-specific resources, jobs and messages are defined by the adopting product.

See [Authentication](authentication.md), [API conventions](api-conventions.md) and [Asynchronous workflow](async-workflow.md) for current behavior.

## Current limits

The starter has no AI provider, billing, teams or passkeys today. Vinext is still in beta and the React Compiler integration is experimental.

The production reference is a regular Docker Compose deployment. It has separate liveness and dependency-readiness checks, security headers and a tested PostgreSQL restore path. It is suitable for Coolify but does not provide zero-downtime traffic switching.

## Positioning

This project is a Laravel and Vinext foundation for coding agents. Agent-ready means discoverable instructions, executable contracts and objective gates; it does not imply product-specific AI behavior.
