# ADR 0008: Source repository with one consumer distribution

Status: accepted.
Implementation: complete.

The development repository is the canonical source but is not itself a GitHub Template. Each stable tag generates one consumer-safe distribution repository. That repository is both the public GitHub Template and the source published on Packagist as `frndchagas/vinext-laravel-starter`, so GitHub and `laravel new --using` create the same application tree. The generated distribution maps to one source tag and does not add an updater.

The distribution flattens the Laravel API into the repository root because Composer and the Laravel installer require `composer.json` and `artisan` there. It includes technical guides through an explicit allowlist and substitutes application-owned agent, contribution, domain and security guidance; maintainer ADRs, incubation notes and publishing procedures are excluded. A dedicated smoke test installs the generated repository through the Laravel Installer before release. The distribution records its source tag and commit, and only stable GitHub releases may publish matching tags.
