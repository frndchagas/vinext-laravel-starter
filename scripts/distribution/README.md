# Vinext Laravel Starter

A ready-to-own Laravel and Vinext application with same-origin sessions, profile and password settings, optional TOTP, generated HTTP contracts, Redis queues, Reverb and an idempotent Task example.

This repository is an application snapshot. There is no starter updater, so you can change every part of it as your product evolves.

## Start locally

Requirements: Bun 1.4+, Node.js 24+, PHP 8.3+, Composer 2.10, Docker Compose and Git.

```bash
composer run dev
```

The command installs locked dependencies, starts the local services, preserves an existing Laravel application key, runs migrations and then starts Vinext, Laravel, Horizon and Reverb.

Open the application at `http://localhost:13000` and Mailpit at `http://localhost:18025`. Register a User, verify the email through Mailpit and open Tasks to exercise the queued realtime flow.

## Main commands

| Command                           | Purpose                                                                |
| --------------------------------- | ---------------------------------------------------------------------- |
| `bun run bootstrap`               | Prepare dependencies, infrastructure, the application key and database |
| `bun run dev`                     | Start the development stack after bootstrap                            |
| `bun run check`                   | Run formatting checks, lint, types, unit tests and the Vinext build    |
| `bun run contracts:check`         | Validate contracts and detect generated artifact drift                 |
| `bun run audit`                   | Check dependency deduplication and security advisories                 |
| `bun run test:e2e`                | Run the Playwright browser journeys                                    |
| `bun run test:production`         | Build and exercise the production containers                           |
| `bun run test:production:browser` | Exercise the standalone containers in Chromium                         |
| `bun run infra:down`              | Stop local infrastructure without deleting volumes                     |

Start by reading [Customize the application](docs/customizing.md), then use the [architecture](docs/architecture.md) and [deployment](docs/deployment.md) guides as references.

## Source

This application was generated from [Vinext Laravel Starter](https://github.com/frndchagas/vinext-laravel-starter). The `.source-tag` and `.source-commit` files record the exact release source. This independent MIT-licensed project is not affiliated with or endorsed by Cloudflare or Laravel.
