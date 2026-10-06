# Development

## Repository rules

`AGENTS.md` is the canonical instruction file for people and coding agents. `CLAUDE.md` imports it so Claude Code reads the same source. The web application adds only its local rules.

Laravel owns identity, authorization, persisted domain state, queues and broadcasts. Vinext owns presentation. Components use the generated client for Laravel application requests.

## Commands

`package.json` is the executable source of truth.

| Command                           | Purpose                                                                             |
| --------------------------------- | ----------------------------------------------------------------------------------- |
| `bun run bootstrap`               | Install locked dependencies, start infrastructure, migrate and seed canonical roles |
| `bun run dev`                     | Start Caddy dependencies plus Vinext, Laravel, Horizon and Reverb                   |
| `bun run check`                   | Format check, lint, types, unit tests and Vinext build                              |
| `bun run contracts:check`         | Validate contracts and detect generated HTTP or realtime drift                      |
| `bun run audit`                   | Check deduplication and dependency advisories                                       |
| `bun run test:e2e`                | Run browser journeys against the development stack                                  |
| `bun run test:production`         | Build and exercise the production containers                                        |
| `bun run test:production:browser` | Exercise the standalone containers in Chromium                                      |

Bun 1.4 runs independent workspace scripts in parallel. Contract generation stays sequential because TypeSpec writes the OpenAPI input consumed by Orval.

## Contract workflow

Public application HTTP changes start in `contracts/http/main.tsp`:

```text
TypeSpec -> OpenAPI 3.1 -> Orval -> Fetch client, Query hooks, Zod and MSW
```

The client validates documented responses with generated Zod schemas in development and tests. An invalid payload fails at the HTTP boundary with the operation, status and field path. Production does not parse responses. Infrastructure may call contracted endpoints directly, as the session fetcher does for Sanctum CSRF; Echo broadcasting authorization remains outside the generated client.

Realtime messages start in `contracts/realtime/asyncapi.yaml`. The official parser validates and dereferences the document before the local generator writes every named TypeScript schema and a committed manifest. PHP tests require matching event fixtures, authorized private channels and payloads for every operation message.

## Included CI

The included GitHub Actions workflow installs locked Bun and Composer dependencies, lints its workflow and shell scripts, validates contract drift, audits dependencies and runs `bun run check`. Dependabot covers Bun, Composer, GitHub Actions and Docker inputs.

E2E, production topology, image scanning, CodeQL and OpenAPI compatibility checks remain available building blocks, but this snapshot does not claim that its consumer CI runs them. Add the gates that match the product risk and branch protection policy. Tests must not call a real external provider.

Lefthook is intentionally smaller. Pre-commit runs format checks and uses Gitleaks when installed; pre-push runs `bun run check`. Contracts, audit, E2E and production remain explicit local commands.

### Temporary braces mitigation

`braces@3.0.3` has no published fix for [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm). Bun applies `patches/braces@3.0.3.patch` on installation. The patch caps brace and parenthesis nesting at 256 and validates AST depth before recursive compile, expand and stringify operations. Deeper inputs and child-node cycles raise a controlled `SyntaxError`.

`bun run audit` runs the native Bun audit without an ignore list. It accepts this finding only after checking the patch registration, locked version, patch and installed-code checksums, and the Node regression proof. Other high and critical findings still block; unknown audit formats fail closed. The production smoke checks the package inside the standalone Node container.

`scripts/braces-mitigation.json` expires at **2026-11-05 00:00 UTC**; the audit fails after that date. The application owner must replace the patch with an upstream fixed release and remove the mitigation-specific evidence and audit handling after fresh-install and production validation. Raw `bun audit` still reports the upstream version as vulnerable because this is a local backport.

## Frontend baseline

The web app uses shadcn/ui components with Base UI primitives and Tailwind CSS through PostCSS. Do not mix primitive systems in one interaction surface.

Vinext 1.0.1 enables the experimental React Compiler through Oxc. Bun installs dependencies and runs workspace scripts; the Vite production build runs on Node 24 locally and in the web image builder. Every Vinext update must pass `vinext check`, production build and E2E.

Vitest and Testing Library cover fast component behavior. Playwright covers browser integration and runs axe WCAG A/AA checks on authenticated screens.

## Generated and runtime files

Do not commit `.env`, credentials, logs, build output, Playwright reports or generated runtime state. OpenAPI, `contracts/realtime/generated` and `packages/api-client/src/generated` are deterministic contract artifacts and must be committed with their source change.

Update the relevant guide when architecture changes. Update `CONTEXT.md` when domain language changes.
