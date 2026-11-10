# Vinext web application

This application contains the Vinext interface and consumes Laravel through the generated API client.

The interface follows the [design system](../../docs/design-system.md): tokens in `app/globals.css`, components in `components/ds/`, charts in `components/ds/charts/` and shadcn/ui primitives (Base UI) in `components/ui/`. The authenticated showcase at `/design-system` renders every component with fictional data.

Run focused checks from this directory:

```bash
bun run format:check
bun run lint
bun run typecheck
bun run test
```

Use the root `bun run dev` command for the complete same-origin stack and `bun run test:e2e` at the root for browser flows.
