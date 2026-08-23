# Getting started

## Requirements

- Bun 1.4 or newer
- Node.js 24 or newer
- PHP 8.3 or newer
- Composer 2.10
- Docker Engine with Docker Compose
- Git

## Start the application

From the installed application directory, run:

```bash
composer run dev
```

The Composer command runs the idempotent bootstrap before development. Bootstrap installs locked JavaScript and PHP dependencies, starts local infrastructure, creates the Laravel application key only when it is missing, runs every migration and synchronizes the canonical roles and permissions.

Open these URLs after Vinext and Laravel report that they are ready:

| Service                      | URL                            |
| ---------------------------- | ------------------------------ |
| Application through Caddy    | `http://localhost:13000`       |
| Laravel health check         | `http://localhost:13000/up`    |
| Database and cache readiness | `http://localhost:13000/ready` |
| Mailpit                      | `http://localhost:18025`       |
| Laravel directly             | `http://localhost:18000`       |

Register a User, open the verification message in Mailpit and follow its link. The dashboard proves that the same Laravel session authorizes a private Reverb channel. Tasks demonstrate idempotent creation, queued processing and HTTP recovery after a WebSocket reconnection.

Run the local quality gates in another terminal:

```bash
bun run contracts:check
bun run check
bun run audit
bun run test:e2e
```

Stop the host processes with `Ctrl+C`, then stop the Docker infrastructure:

```bash
bun run infra:down
```

Docker volumes are preserved. Use `docker compose down --volumes` only when you intend to delete local PostgreSQL and Redis data.

Continue with [Customize the application](customizing.md). If setup fails, use [Troubleshooting](troubleshooting.md).
