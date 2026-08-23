# Customize the starter

The GitHub template gives each application its own history. There is no updater, so remove the starter identity before building product features.

## Rename the product

Search for the public name and package namespace:

```bash
rg "Vinext Laravel Starter|vinext-laravel-starter|@vinext-laravel-starter|starter-key|starter-secret"
```

Review each match instead of applying a blind replacement. Update at least:

- root and workspace package names;
- Laravel `APP_NAME` and mail sender values;
- TypeSpec and AsyncAPI titles;
- page metadata and visible branding;
- Docker Compose project, database and development credentials;
- generated-client imports if the workspace namespace changes.

Regenerate HTTP artifacts after changing contract titles or namespaces:

```bash
bun run contracts:build
```

## Configure URLs and ports

Copy the root `.env.example` and change ports there. The development command propagates those values to Docker, host processes and Caddy upstreams. Laravel application settings live in `apps/api/.env`; never commit either file.

`APP_NAME`, `APP_DESCRIPTION` and `APP_URL` drive page titles, canonical URLs and social cards. Set `APP_REPOSITORY_URL` only when the product has its own public repository. Add a 1200 × 630 product image and point `APP_SOCIAL_IMAGE` to it; generated applications leave both values empty instead of advertising the starter. New deployments default to `APP_INDEXABLE=false`; enable it only when the public root page is ready for search engines. Authenticated routes remain `noindex`.

Production secrets do not belong in either example file. Generate unique Laravel and Reverb keys in the deployment environment.

## Replace the reference flow

`Task` is a teaching resource, not a product abstraction. Keep it while learning the vertical path, then either rename it into a real domain concept or remove its contract, migration, job, event, routes, screen and tests together.

Do not keep `Task` as a generic bucket for unrelated background work. New public HTTP types begin in TypeSpec, and new observable realtime messages begin in AsyncAPI.

## Final check

Before the first product commit:

```bash
rg "Vinext Laravel Starter|vinext-laravel-starter|@vinext-laravel-starter|starter-key|starter-secret"
bun run contracts:check
bun run check
bun run test:e2e
```

The first search should contain only references you deliberately kept, such as attribution or migration notes.
