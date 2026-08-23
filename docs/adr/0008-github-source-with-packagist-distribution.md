# ADR 0008: GitHub source with Packagist distribution

Status: accepted.
Implementation: complete.

The GitHub template is the canonical source. Each stable tag generates a small distribution repository published on Packagist as `frndchagas/vinext-laravel-starter`. It exposes the starter through `laravel new --using` and qualifies for submission to the community starter directory. The generated distribution maps to one source tag and does not add an updater to applications created from the starter.

The distribution flattens the Laravel API into the repository root because Composer and the Laravel installer require `composer.json` and `artisan` there. A dedicated smoke test installs the generated repository through the Laravel Installer before release. The distribution records its source tag and commit, and only stable GitHub releases may publish matching tags.
