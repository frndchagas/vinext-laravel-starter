# Troubleshooting

Start with the symptom. Run commands from the repository root unless a step says otherwise.

## The public URL returns 502

Confirm that the host processes are listening and that Caddy received matching upstreams:

```bash
lsof -nP -iTCP:13100 -iTCP:18000 -iTCP:19080 -sTCP:LISTEN
docker compose exec caddy sh -lc 'printf "%s\n%s\n%s\n" "$WEB_UPSTREAM" "$API_UPSTREAM" "$REVERB_UPSTREAM"'
```

Restart `bun run dev` after changing root ports. Caddy reads upstream values when its container is created.

## Migrations reached the wrong database

Check the effective Docker port and the Laravel connection before running another migration:

```bash
docker compose port postgres 5432
cd apps/api && php artisan about --only=environment
```

Use `bun run bootstrap` from the root. It passes the root `POSTGRES_PORT` to Laravel during setup.

## Password-reset mail does not arrive

Open Mailpit at `http://localhost:18025` and confirm the Laravel mail settings in `apps/api/.env`. The reset link must point to `/reset-password` on `APP_URL`, not to a Fortify view route.

## Realtime never connects

Check the direct Reverb port and the same-origin path:

```bash
lsof -nP -iTCP:19080 -sTCP:LISTEN
curl -i http://localhost:13000/up
```

The browser connects through `/ws`; Caddy strips that prefix before proxying to Reverb. Confirm that the Reverb key in the frontend matches the Laravel environment and that the User has verified their email.

## A background job stays queued

Horizon or the queue worker is not consuming jobs. Inspect the development terminal and Laravel log, then check Horizon directly at `http://localhost:18000/horizon` in the local environment.

## Generated files changed unexpectedly

Run the generator and inspect the diff:

```bash
bun run contracts:build
git diff -- contracts/http/openapi packages/api-client/src/generated
```

Do not edit generated files by hand. Change TypeSpec or the Orval configuration instead.

## Bootstrap fails

Capture the versions before changing dependencies:

```bash
bun --version
node --version
php --version
composer --version
docker version
docker compose version
```

Then run `bun ci`, `composer install --working-dir apps/api --no-interaction` and `docker compose config --quiet` separately to identify the failing boundary.
