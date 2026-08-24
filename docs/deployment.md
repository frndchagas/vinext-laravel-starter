# Deployment

The production reference runs one public Caddy service with separate containers for Vinext, Laravel, Horizon, the scheduler and Reverb. PostgreSQL and Redis keep persistent volumes. Laravel migrations run once before application services start. The scheduler reconciles unfinished Task delivery, records Horizon metrics every five minutes and prunes failed jobs after seven days.

## Environment

Copy the example only for local inspection. In Coolify, create the variables through the environment editor instead of committing a file.

```bash
cp .env.production.example .env.production
```

Set unique values for `APP_KEY`, `POSTGRES_PASSWORD`, `REVERB_APP_KEY` and `REVERB_APP_SECRET`. `APP_URL` includes the public scheme and host. `APP_HOST` contains only the host, plus a port when the public URL uses one.

`REVERB_ALLOWED_ORIGINS` is a comma-separated hostname list without ports. It defaults to `APP_HOST`, which is sufficient for regular HTTPS domains; set it explicitly when `APP_HOST` contains a development or smoke-test port.

Set `APP_DESCRIPTION` for metadata and keep `APP_INDEXABLE=false` on previews or private products. Only the public root page becomes indexable when the flag is true; authenticated routes stay out of search results. `APP_REPOSITORY_URL` and `APP_SOCIAL_IMAGE` are optional and empty in generated applications. Relative social-image paths become absolute through `APP_URL`.

`LEGACY_APP_HOST` is optional. Set it to one previous hostname to return a permanent redirect to `APP_URL`; the proxy preserves the path and query. Leave it unset when no redirect is needed.

The example logs mail instead of sending it. Configure a real SMTP provider, including `MAIL_SCHEME`, before exposing registration or password reset to users. Password reset is part of the default authentication surface. Public registration defaults to disabled and requires `FEATURE_REGISTRATION=true`.

`/up` proves that Laravel can serve a request. `/ready` also checks the configured database and cache. Both endpoints are stateless and do not issue session or CSRF cookies. Use `/ready` to decide whether a deployment should receive traffic; do not restart PHP merely because an external dependency is temporarily unavailable.

## Local production smoke

The automated smoke builds every image and starts the full production topology. It applies migrations, sends one Task through Horizon, inserts an orphaned Task for scheduler recovery and restores a PostgreSQL backup into a new database:

```bash
bunx playwright install chromium # first browser run only
bun run test:production
bun run test:production:browser
```

The first command exercises HTTP, queues and recovery. The browser variant also proves SSR before hydration, RSC navigation without reload, private Reverb authorization and a Task completion event. Both use a separate Compose project and delete their containers and volumes when they exit.

## Coolify

Create a Docker Compose application from the public repository and select `compose.coolify.yaml`. Assign a domain to the `proxy` service on port `8080`. Keep PostgreSQL and Redis private. The Coolify-specific file excludes the one-time migration container from aggregate health checks and is generated from the production Compose file with `bun run coolify:build`.

Add every variable from `.env.production.example`. Do not expose the internal API, Reverb, PostgreSQL or Redis ports. Configure the service health path as `/ready` with expected status `200`. Container liveness checks continue to use `/up`.

Deploys run migrations before starting the application services. Published migrations must remain backward compatible with the previous release.

## PostgreSQL backup and restore

The scripts use the `postgres` service from the active Compose project. They create custom-format dumps without ownership or privilege statements. A restore always targets a new database and refuses to replace the configured application database.

```bash
export COMPOSE_FILE=compose.production.yaml
install -d -m 700 ../vinext-backups
POSTGRES_ENV_FILE=.env.production bun run db:backup -- ../vinext-backups/before-migration.dump
POSTGRES_ENV_FILE=.env.production bun run db:restore -- ../vinext-backups/before-migration.dump starter_recovery
```

Keep the backup outside the repository with restrictive storage permissions. After restoration, point a temporary application instance at `starter_recovery`, run `/ready` and verify critical records before changing production traffic. Provider snapshots remain useful, but they do not replace a tested logical restore.

## Managed PostgreSQL and Redis

The API environment accepts `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`, `REDIS_HOST`, `REDIS_PORT` and `REDIS_PASSWORD`. In Coolify, set those values to the private managed-service endpoints. Then remove the embedded `postgres` and `redis` services and their `depends_on` entries from your deployment copy. Keep TLS, certificate and network settings required by the provider in that application-specific override. Use the provider's backup policy and periodically run the same `pg_restore` verification against an isolated database.

## Response headers

The production proxy rejects unknown Host authorities with `421`, while the optional legacy host redirects first. It sets CSP, HSTS, clickjacking, MIME-sniffing, referrer and browser-permission policies. CSP permits WebSockets only on `APP_HOST`; inline scripts and styles remain because the Vinext bootstrap requires them.

## Container scan policy

The canonical release CI scans every production image with Trivy and blocks fixable high and critical findings. The official PostgreSQL image bundles `gosu` with an older Go standard library, but its [upstream binary scan](https://github.com/tianon/gosu/actions/runs/32607173744) found no reachable vulnerable symbols. The corresponding exceptions apply only to that binary and package version, expire on September 30, 2026, and do not permit new findings.

Coolify recreates services in a regular Docker Compose deployment. This reference does not claim zero downtime. Roll back by selecting the previous source tag and redeploying it; do not roll back the database unless the migration has an explicit reversal plan.
