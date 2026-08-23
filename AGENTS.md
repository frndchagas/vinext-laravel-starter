# Repository instructions

## Map

- `apps/web`: Vinext frontend, React, shadcn/ui and Tailwind CSS.
- `apps/api`: Laravel API and the source of truth for identity and domain state.
- `contracts/http/main.tsp`: source for application HTTP.
- `contracts/realtime/asyncapi.yaml`: source for observable realtime messages.
- `packages/api-client`: generated TypeScript client.
- `docs/`: architecture guides. Decision records live in `docs/adr/`.
- `CONTEXT.md`: domain glossary. Use its canonical terms in code, contracts and UI.

## Commands

- `bun run bootstrap`: install dependencies, start local infrastructure and migrate.
- `bun run dev`: start the proxy, web, API, Horizon and Reverb.
- `bun run format`: format TypeScript and PHP.
- `bun run check`: run formatting checks, lint, types, unit tests and build.
- `bun run contracts:check`: validate HTTP and realtime contracts and fail on generated drift.
- `bun run test:e2e`: run the Playwright flows against the development stack.
- `bun run test:production:browser`: exercise the standalone production containers in Chromium.

## Rules

- Start public HTTP changes in TypeSpec and realtime changes in AsyncAPI.
- Do not hand edit `contracts/http/openapi`, `contracts/http/generated`, `contracts/realtime/generated` or `packages/api-client/src/generated`.
- Commit contract sources and their generated artifacts together.
- Keep authentication, authorization and persisted domain state in Laravel.
- Do not add a second formatter, linter or package manager.
- Tests must not use real external services.
- Never commit `.env`, credentials or generated runtime artifacts.
- Update the relevant decision document when architecture changes.
