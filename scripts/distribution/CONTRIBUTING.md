# Development workflow

This application snapshot does not decide whether the product accepts outside contributions. Replace this introduction with the policy and contact details for your project before publishing it. The technical workflow below is ready to use for internal changes and pull requests.

## Setup

Follow [Getting started](docs/getting-started.md), then read the root and application-level `AGENTS.md` files before editing.

## Before opening a pull request

Run the standard gate:

```bash
bun run check
```

Run additional gates when a change touches their boundary:

```bash
bun run contracts:check  # TypeSpec, OpenAPI, Orval or AsyncAPI
bun run audit            # dependencies or lockfiles
bun run test:e2e         # auth, mail, queue, realtime or browser behavior
bun run test:production  # containers, proxy, migrations or deployment behavior
```

Lefthook runs a smaller local subset. Pre-commit checks formatting and uses Gitleaks when it is installed. Pre-push runs `bun run check`. The included CI runs contracts, audits and the standard gate; add E2E and production jobs when those guarantees are required for every change.

## Public contracts

Application HTTP changes begin in `contracts/http/main.tsp`. Regenerate OpenAPI and the client with `bun run contracts:build`, then commit source and generated artifacts together. Realtime messages begin in `contracts/realtime/asyncapi.yaml`.

Do not edit `contracts/http/openapi`, `contracts/http/generated`, `contracts/realtime/generated` or `packages/api-client/src/generated` by hand.

## Documentation

Guides describe current behavior. Update `CONTEXT.md` only when domain language changes; implementation terms do not belong there.

## Pull request checklist

- the changed behavior has a test or reproducible proof;
- public contracts and generated files agree;
- migrations are additive and published migrations are unchanged;
- no secret, `.env`, log, build output or browser artifact is committed;
- current documentation still matches the implementation.
