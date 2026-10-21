# ADR 0017: remove the Tasks example

Status: accepted.
Implementation: complete.

The starter core provides identity, Account settings, User administration and infrastructure for application features. The pedagogical Tasks vertical adds a domain concept that adopters must otherwise rename or remove, so it is removed from the interface, HTTP and realtime contracts, Laravel implementation and tests.

Removing `GET /api/v1/tasks`, `POST /api/v1/tasks` and `GET /api/v1/tasks/{id}` is an intentional breaking change. The source CI's oasdiff retirement list accepts only the removal diagnostic for those three operations; other compatibility failures still block a pull request.

Horizon, Redis queues, the scheduler and Reverb remain configured. The verified User's private channel remains the connectivity and authorization reference. New background work and observable messages belong to the adopting application's domain.

Published migrations remain unchanged. A forward migration drops the example's `tasks` and `idempotency_keys` tables for both fresh installations and upgrades. Its rollback restores empty tables and cannot recover deleted records. Existing deployments must back up their database, finish queued example jobs with the previous code and stop old workers before applying this migration. Rolling back the previous application requires restoring the matching database backup.

HTTP and realtime generators continue to run. The production browser smoke verifies SSR, private-channel authorization and RSC navigation to Account settings; the restore smoke verifies Users and migration history. These checks no longer claim background-job or domain-event delivery coverage.

This decision supersedes [ADR 0016](0016-persisted-task-reconciliation.md).
