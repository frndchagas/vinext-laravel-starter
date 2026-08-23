# Source development

This guide runs the canonical source repository, including maintainer tooling and the nested Laravel workspace. To create an application, use the Laravel Installer command in the root README or the generated GitHub Template instead.

## Requirements

- Bun 1.4 or newer
- Node.js 24 or newer
- PHP 8.3 or newer
- Composer 2.10
- Docker Engine with Docker Compose
- Git

## Start the source application

```bash
git clone https://github.com/frndchagas/vinext-laravel-starter.git
cd vinext-laravel-starter
cp .env.example .env
bun run bootstrap
bun run dev
```

`bootstrap` installs locked JavaScript and PHP dependencies, starts local infrastructure, creates the Laravel application key, runs every migration and synchronizes the canonical roles and permissions. It is safe to run again.

Open these URLs after `dev` reports that Vinext and Laravel are ready:

| Service                      | URL                            |
| ---------------------------- | ------------------------------ |
| Application through Caddy    | `http://localhost:13000`       |
| Laravel health check         | `http://localhost:13000/up`    |
| Database and cache readiness | `http://localhost:13000/ready` |
| Mailpit                      | `http://localhost:18025`       |
| Laravel directly             | `http://localhost:18000`       |

Register a User, open the verification message in Mailpit and follow its link. The dashboard proves the same Laravel session can authorize a private Reverb channel. The Tasks page proves idempotent creation, queued processing and recovery through the HTTP API after a WebSocket reconnection.

Run the local quality gates in another terminal:

```bash
bun run check
bun run contracts:check
bun run audit
bun run test:e2e
```

Stop the host processes with `Ctrl+C`, then stop the Docker infrastructure:

```bash
bun run infra:down
```

Docker volumes are preserved by that command. Use `docker compose down --volumes` only when you intend to delete the local PostgreSQL and Redis data.

Continue with [Customize the starter](customizing.md). If setup fails, use [Troubleshooting](troubleshooting.md).
