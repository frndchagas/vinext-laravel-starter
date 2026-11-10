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

## Theme and tokens

The interface follows the [design system](design-system.md): neutral surfaces, Figtree as the single font, one compact scale and colour only where it carries meaning. Everything is a token in `apps/web/app/globals.css`, so a product changes values, not components.

- **Brand colour.** Keep the neutral interface and give the brand a role instead of painting surfaces: the primary button is `--primary`, the focus ring is `--ring`, and a brand hue for data goes in `--chart-1` or the accent set `--accent-1..5`. Any new series colour must pass the palette validator (luminance band, colour-blindness separation, contrast) in both themes.
- **Dark theme.** Change the values under `.dark` and keep the roles; `lib/appearance.ts` applies the class from a cookie before the first paint.
- **Font.** `app/layout.tsx` loads Figtree through `next/font/google` and exposes it as `--font-figtree`. Swap the import and the variable to change the font; keep `tabular-nums` on numbers.
- **Scale.** `--text-*`, `--space-*`, `--row-height` and `--control-height` live in `@theme` and `:root`. Change them there; `lib/utils.ts` registers the class groups in tailwind-merge, so add any new size or spacing to `cn()` too.
- **Formatting.** `apps/web/components/ds/format.ts` defaults to `en-US` and `USD`. Change the locale constant and pass `currency` where the product needs another one.
- **Showcase.** `/design-system` (sidebar: Developer) is a reference for review. Delete `apps/web/app/(authenticated)/design-system/` and the sidebar item when the product does not want it; the components stay.

## Add product features

The starter includes identity, Account settings and User administration. Define product resources in the application domain; there is no bundled Tasks CRUD or background-processing example.

New public HTTP types begin in TypeSpec, and new observable realtime messages begin in AsyncAPI. Persist application state in Laravel and use the configured queue and Reverb infrastructure when the feature needs it.

## Final check

Before the first product commit:

```bash
rg "Vinext Laravel Starter|vinext-laravel-starter|@vinext-laravel-starter|starter-key|starter-secret"
bun run contracts:check
bun run check
bun run test:e2e
```

The first search should contain only references you deliberately kept, such as attribution or migration notes.
