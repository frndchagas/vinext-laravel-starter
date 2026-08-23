# Vinext Laravel Starter

[![CI](https://github.com/frndchagas/vinext-laravel-starter/actions/workflows/ci.yml/badge.svg)](https://github.com/frndchagas/vinext-laravel-starter/actions/workflows/ci.yml)

A Laravel and Vinext foundation for coding agents.

[Live demo](https://vinext-laravel-starter.dev-0.fortetecnologias.com.br) · [Deployment guide](docs/deployment.md)

![Vinext Laravel Starter](.github/social-preview.jpg)

The starter provides same-origin sessions, profile and password settings, optional TOTP, explicit HTTP and realtime contracts, a generated TypeScript client, working role-based administration, Redis queues, Reverb and one idempotent asynchronous flow. It is designed for agent-assisted development, but does not bundle an AI provider.

Vinext is still in beta and the React Compiler integration is experimental. CI verifies local setup, browser behavior, a fresh template snapshot and the production container topology.

## Create an application

Requirements: Bun 1.4+, Node.js 24+, PHP 8.3+, Composer 2.10, Laravel Installer 5.31+, Docker Compose and Git.

```bash
laravel new my-app --using=frndchagas/vinext-laravel-starter --phpunit --bun --no-boost
cd my-app
composer run dev
```

Open `http://localhost:13000`, register a User and use Mailpit at `http://localhost:18025` to verify the email. The Tasks page demonstrates queued processing and private realtime updates.

The [generated distribution](https://github.com/frndchagas/vinext-laravel-starter-distribution) is also the GitHub Template. Both paths create the same consumer-safe snapshot with its own history and no updater.

## Develop the source

Clone this repository only when contributing to the starter or inspecting its release tooling:

```bash
git clone https://github.com/frndchagas/vinext-laravel-starter.git
cd vinext-laravel-starter
cp .env.example .env
bun run bootstrap
bun run dev
```

See [Source development](docs/getting-started.md) for the expected services, shutdown steps and first validation.

## Commands

| Command                                               | Purpose                                                                             |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `bun run bootstrap`                                   | Install locked dependencies, start infrastructure, migrate and seed canonical roles |
| `bun run dev`                                         | Start Caddy dependencies, Vinext, Laravel, Horizon and Reverb                       |
| `bun run check`                                       | Format check, lint, types, unit tests and Vinext build                              |
| `bun run contracts:check`                             | Validate HTTP and realtime contracts and detect generated drift                     |
| `bun run audit`                                       | Check dependency deduplication and advisories                                       |
| `bun run test:e2e`                                    | Run the Playwright browser journeys                                                 |
| `bun run test:production`                             | Build and exercise the production containers                                        |
| `bun run test:template`                               | Create and verify a fresh template snapshot                                         |
| `bun run infra:down`                                  | Stop local Docker infrastructure without deleting volumes                           |
| `bun run db:backup -- backup.dump`                    | Create a private PostgreSQL custom-format backup                                    |
| `bun run db:restore -- backup.dump restored_database` | Restore into a new PostgreSQL database                                              |

## Documentation

- [Documentation index](docs/README.md)
- [Customize the starter](docs/customizing.md)
- [Architecture](docs/architecture.md)
- [Deployment](docs/deployment.md)
- [Laravel and Packagist distribution](docs/distribution.md)
- [Troubleshooting](docs/troubleshooting.md)
- [Contributing](CONTRIBUTING.md)
- [Security policy](SECURITY.md)

This independent MIT-licensed project is not affiliated with or endorsed by Cloudflare or Laravel.
