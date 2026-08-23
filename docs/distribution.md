# Distribution

The source repository contains maintainer tooling and the canonical release history. Stable releases publish a consumer-safe Laravel-root snapshot to `frndchagas/vinext-laravel-starter-distribution`. That generated repository is the GitHub Template and the source used by Packagist as `frndchagas/vinext-laravel-starter`, so both installation paths start from the same tree.

```bash
laravel new my-app \
  --using=frndchagas/vinext-laravel-starter \
  --phpunit \
  --bun \
  --no-boost
```

The extra flags keep the starter's PHPUnit, Bun, and agent setup intact. Applications receive a snapshot and own their code; there is no starter updater.

Each distribution tag contains `.source-tag` and `.source-commit`. They identify the exact tag and commit in the source repository. The generated application replaces maintainer automation and governance with a lightweight consumer CI, Dependabot configuration, application-owned security guidance and an allowlist of technical documentation. Its README starts from the installed application instead of sending the User back through starter installation.

Source CI creates a local Composer repository and invokes the current pinned Laravel Installer with the documented `--using`, `--phpunit`, `--bun` and `--no-boost` flags. The installed application migrates SQLite, checks contract drift, runs the PHP and TypeScript gates, builds Vinext and exercises the production topology.

Maintainers publish only through a stable GitHub release. The release workflow generates the flattened tree, pushes the matching release tag to the distribution repository and requests a Packagist update. It succeeds only after Packagist maps that tag to the exact distribution commit.

## Release preflight

Run `bun run release:check -- TAG` from a clean, synchronized `main` checkout after its complete CI succeeds, replacing `TAG` with the next unused `vMAJOR.MINOR.PATCH` value.

The command rejects reused or non-SemVer tags and prints the annotated-tag and GitHub Release commands. The publisher independently requires the exact tagged SHA to have one successful full `main` push workflow with every required job present. It serializes all releases, pushes the distribution commit and tag atomically, and verifies the public Packagist metadata before finishing. The protected `distribution` environment stores only the deploy key. The separate `packagist` environment stores only a SAFE token; the MAIN token is not used.

If an existing tag needs to be indexed again, run the repair from `main`:

```bash
gh workflow run publish-distribution.yml \
  --repo frndchagas/vinext-laravel-starter \
  --ref main \
  -f tag=vMAJOR.MINOR.PATCH
```

The repair verifies the immutable source release, its complete `main` CI run and the existing distribution tag before entering the `packagist` environment. It cannot create or move a Git tag and cannot access the distribution deploy key.
