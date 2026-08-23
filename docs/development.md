# Development

## Repository rules

`AGENTS.md` is the canonical instruction file for people and coding agents. The files under each application add only local rules. `CLAUDE.md` imports the corresponding `AGENTS.md` so Claude Code reads the same source.

Laravel owns identity, authorization, persisted domain state, queues and broadcasts. Vinext owns presentation. Components use the generated client for Laravel application requests.

## Commands

`package.json` is the executable source of truth. The main commands are:

| Command | Purpose |
| --- | --- |
| `bun run bootstrap` | Install locked dependencies, start infrastructure, migrate and seed canonical roles |
| `bun run dev` | Start Caddy dependencies plus Vinext, Laravel, Horizon and Reverb |
| `bun run check` | Format check, lint, types, unit tests and Vinext build |
| `bun run contracts:check` | Validate contracts and detect generated HTTP or realtime drift |
| `bun run audit` | Check deduplication and dependency advisories |
| `bun run test:e2e` | Run the browser journeys against the development stack |

Bun 1.4 runs independent workspace scripts in parallel. Contract generation stays sequential because TypeSpec writes the OpenAPI input consumed by Orval.

## Contract workflow

Public application HTTP changes start in `contracts/http/main.tsp`:

```text
TypeSpec -> OpenAPI 3.1 -> Orval -> Fetch client, Query hooks, Zod and MSW
```

The client validates documented responses with generated Zod schemas in development and tests. An invalid payload fails at the HTTP boundary with the operation, status and field path. Production does not parse responses. Infrastructure may call contracted endpoints directly, as the session fetcher does for Sanctum CSRF; Echo broadcasting authorization remains outside the generated client.

Realtime messages start in `contracts/realtime/asyncapi.yaml`. The official parser validates and dereferences the document before the local generator writes every named TypeScript schema and a committed manifest. PHP tests require matching event fixtures, authorized private channels and payloads for every operation message.

## Quality gates

GitHub Actions always runs the fast verification, dependency and secret checks on pull requests. Changed paths select the integration and expensive smoke jobs. Pushes to `main`, nightly schedules and manual pre-release runs execute the complete suite:

- verification on PHP 8.5 with frozen installs, workflow and shell lint, dependency audit, contracts and the standard gate;
- integration tests on PHP 8.3 and 8.5 against PostgreSQL and Redis;
- serial Chromium E2E for auth, mail, queues and reconnection;
- a fresh template snapshot with isolated ports, migrations, contracts, build and proxy smoke tests;
- a flattened package installed through the real Laravel Installer, followed by its consumer and production gates;
- production image builds followed by migrations, readiness, security-header checks, a session flow, queued Task processing and a PostgreSQL restore round-trip;
- Trivy scans fixable high and critical vulnerabilities in the application, proxy, Redis and PostgreSQL runtime images when Docker inputs change and on every complete run;
- Gitleaks, dependency review and OpenAPI breaking-change detection;
- GitHub CodeQL default setup outside the repository workflow.

Lefthook is intentionally smaller. Pre-commit runs format checks and uses Gitleaks when installed; pre-push runs `bun run check`. Contracts, audit and E2E remain explicit local commands and CI gates.

Tests never call a real external provider. The starter has no AI provider in the current release.

Dependabot checks Bun, Composer, GitHub Actions and every Dockerfile or Compose manifest each week. Major dependency updates and Docker runtime-line changes remain manual; automated Docker pull requests are patch-only and must pass the production gate.

## Frontend baseline

The web app uses shadcn/ui components with Base UI primitives and Tailwind CSS through PostCSS. Do not mix primitive systems in one interaction surface.

Vinext 1.0.0-beta.8 enables the experimental React Compiler through Oxc. Every Vinext update must pass `vinext check`, production build and E2E.

Vitest and Testing Library cover fast component behavior. Playwright covers browser integration and runs axe WCAG A/AA checks on authenticated screens.

## Generated and runtime files

Do not commit `.env`, credentials, logs, build output, Playwright reports or generated runtime state. OpenAPI, `contracts/realtime/generated` and `packages/api-client/src/generated` are deterministic contract artifacts and must be committed with their source change.

Architecture changes require an ADR. Domain language changes require an update to `CONTEXT.md`.
