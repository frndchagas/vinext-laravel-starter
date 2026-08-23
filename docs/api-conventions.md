# API conventions

These rules apply to every application endpoint exposed through the generated client.

## Addressing and types

- Application routes use `/api/v1`; the current OpenAPI document reports contract version 1.0.0.
- Resource IDs are opaque strings backed by UUIDv7.
- Dates use ISO 8601 UTC values.
- Money uses integer minor units and a separate currency code.
- Optional and nullable fields are different concepts.

## Responses

- Resources and collections use stable shapes declared in TypeSpec.
- Errors use RFC 9457 Problem Details with machine-readable domain codes where needed.
- Validation errors include a stable field-to-messages map, validated at the client boundary in development and tests.
- Rate limits return documented `429` Problem Details with `Retry-After`.
- Potentially large collections use cursor pagination.
- Every Laravel API response carries `X-Correlation-Id`; middleware adds this cross-cutting header, which is not repeated in every generated response type today.

## Asynchronous mutations

Use `Idempotency-Key` when retrying a mutation could duplicate work. Persist the resource and initial state before dispatching after commit. Replaying the same key and validated input must return the original result; conflicting reuse returns `409`.

Realtime messages never replace the read API. A client can rebuild current state without receiving an event.

## Compatibility

HTTP changes begin in TypeSpec and include regenerated OpenAPI, route-surface metadata and client artifacts. PHP tests compare contracted methods and paths with Laravel in both directions. On pull requests, oasdiff compares the proposed document with the target branch. This is not a comparison with the latest tagged release.

Protocol endpoints owned by Sanctum, Fortify or Echo may be invoked by infrastructure instead of a generated product hook. Document each exception in [Authentication](authentication.md).
