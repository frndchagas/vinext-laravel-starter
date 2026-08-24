#!/usr/bin/env bash

set -euo pipefail

distribution_dir=$(mktemp -d)
sync_target=$(mktemp -d)
install_parent=$(mktemp -d)
install_dir="$install_parent/application"
composer_home=$(mktemp -d)
composer_cache=$(composer config --global cache-dir --absolute)
dev_pid=""
dev_project="vinext-distribution-dev-${GITHUB_RUN_ID:-$$}-${GITHUB_RUN_ATTEMPT:-1}"

retry_once() {
    if "$@"; then
        return 0
    fi

    sleep 5
    "$@"
}

stop_dev_stack() {
    if [[ -n "$dev_pid" ]]; then
        kill -TERM -- "-$dev_pid" 2>/dev/null || kill -TERM "$dev_pid" 2>/dev/null || true

        for _ in {1..50}; do
            if ! kill -0 "$dev_pid" 2>/dev/null; then
                break
            fi
            sleep 0.1
        done

        kill -KILL -- "-$dev_pid" 2>/dev/null || kill -KILL "$dev_pid" 2>/dev/null || true
        wait "$dev_pid" 2>/dev/null || true
        dev_pid=""
    fi

    if [[ -d "$install_dir" ]]; then
        (
            cd "$install_dir"
            docker compose --project-name "$dev_project" down --volumes --remove-orphans
        ) || true
    fi
}

cleanup() {
    set +e

    stop_dev_stack
    rm -rf "$distribution_dir" "$sync_target" "$install_parent" "$composer_home"
}

trap cleanup EXIT

rmdir "$distribution_dir"
bun run scripts/build-distribution.mjs "$distribution_dir"
test ! -e "$distribution_dir/node_modules"

archive_overrides=(
    'scripts/distribution/AGENTS.md|AGENTS.md'
    'scripts/distribution/CONTEXT.md|CONTEXT.md'
    'scripts/distribution/CONTRIBUTING.md|CONTRIBUTING.md'
    'scripts/distribution/README.md|README.md'
    'scripts/distribution/SECURITY.md|SECURITY.md'
    'scripts/distribution/ci.yml|.github/workflows/ci.yml'
    'scripts/distribution/development.md|docs/development.md'
    'scripts/distribution/docs-README.md|docs/README.md'
    'scripts/distribution/getting-started.md|docs/getting-started.md'
)
for override in "${archive_overrides[@]}"; do
    source_path=${override%%|*}
    output_path=${override#*|}
    git show "HEAD:$source_path" | cmp - "$distribution_dir/$output_path"
done

mkdir -p "$sync_target/.git"
printf 'replacement\n' > "$sync_target/.source-tag"
touch -r "$distribution_dir/.source-tag" "$sync_target/.source-tag"
touch "$sync_target/.git/keep"
test "$(wc -c < "$sync_target/.source-tag")" -eq \
    "$(wc -c < "$distribution_dir/.source-tag")"
bash scripts/sync-distribution.sh "$distribution_dir" "$sync_target"
cmp "$distribution_dir/.source-tag" "$sync_target/.source-tag"
test -f "$sync_target/.git/keep"

(
    cd "$distribution_dir"
    git init --initial-branch=main --quiet
    git config user.name "Distribution Smoke"
    git config user.email "distribution-smoke@example.com"
    git add .
    git commit --quiet -m "Build distribution"
    git tag v0.0.0
)

COMPOSER_CACHE_DIR="$composer_cache" COMPOSER_HOME="$composer_home" \
    composer config --global repositories.starter vcs "$distribution_dir"
retry_once env \
    COMPOSER_CACHE_DIR="$composer_cache" \
    COMPOSER_HOME="$composer_home" \
    composer global require laravel/installer:5.31.1 --no-interaction --prefer-dist

install_application() {
    (
        cd "$install_parent" || exit 1
        COMPOSER_CACHE_DIR="$composer_cache" COMPOSER_HOME="$composer_home" \
        "$composer_home/vendor/bin/laravel" new application \
            --using=frndchagas/vinext-laravel-starter \
            --phpunit \
            --bun \
            --no-boost \
            --no-interaction
    )
}

if ! install_application; then
    rm -rf "$install_dir"
    sleep 5
    install_application
fi

(
    cd "$install_dir"
    test ! -e .git
    # PHP receives this program literally.
    # shellcheck disable=SC2016
    php -r '
        $composer = json_decode(file_get_contents("composer.json"), true, flags: JSON_THROW_ON_ERROR);
        $valid = ($composer["name"] ?? null) === "frndchagas/vinext-laravel-starter"
            && ($composer["homepage"] ?? null) === "https://github.com/frndchagas/vinext-laravel-starter"
            && ($composer["scripts"]["dev"][1] ?? null) === "bun run bootstrap && bun run dev";
        exit($valid ? 0 : 1);
    '
    test -f .github/workflows/ci.yml
    test -f .github/dependabot.yml
    test ! -e .github/workflows/publish-distribution.yml
    test ! -e scripts/build-distribution.mjs
    test ! -e scripts/build-distribution.test.mjs
    test ! -e scripts/ci-policy.mjs
    test ! -e scripts/ci-policy.test.mjs
    test ! -e scripts/packagist-sync.mjs
    test ! -e scripts/packagist-sync.test.mjs
    test ! -e scripts/trivy-ignore.test.mjs
    test ! -e apps/web/app/opengraph-image.jpg
    test ! -e apps/web/app/opengraph-image.alt.txt
    test ! -e docs/adr
    test ! -e docs/distribution.md
    test ! -e docs/incubation.md
    grep --quiet '^WEB_PUBLIC_PORT=13000$' .env.example
    grep --quiet '^APP_REPOSITORY_URL=$' .env.example
    grep --quiet '^APP_SOCIAL_IMAGE=$' .env.example
    grep --quiet '^## Laravel instructions$' AGENTS.md
    grep --quiet '`app`, `routes`, `database` and `tests`' AGENTS.md
    test "$(cat CLAUDE.md)" = '@AGENTS.md'
    grep --quiet 'The application owner is responsible' SECURITY.md
    grep --quiet '\.source-tag.*\.source-commit' SECURITY.md
    grep --quiet 'new URL("../../../", import.meta.url)' apps/web/e2e/helpers.ts
    if grep --quiet 'git clone https://github.com/frndchagas/vinext-laravel-starter' README.md; then
        echo 'Consumer README sends the User back through starter installation.' >&2
        exit 1
    fi

    expected_markdown_files=(
        AGENTS.md
        CLAUDE.md
        CONTEXT.md
        CONTRIBUTING.md
        README.md
        SECURITY.md
        apps/web/AGENTS.md
        apps/web/CLAUDE.md
        apps/web/README.md
        docs/README.md
        docs/api-conventions.md
        docs/architecture.md
        docs/async-workflow.md
        docs/authentication.md
        docs/customizing.md
        docs/deployment.md
        docs/development.md
        docs/getting-started.md
        docs/troubleshooting.md
    )
    expected_markdown=$(printf '%s\n' "${expected_markdown_files[@]}")
    actual_markdown=$(find . \
        \( -path './apps/web/dist' -o -path './node_modules' -o -path './vendor' \) -prune -o \
        -type f -name '*.md' -print | sed 's#^\./##' | sort)
    if [[ "$actual_markdown" != "$expected_markdown" ]]; then
        echo 'Distribution Markdown does not match the consumer allowlist.' >&2
        diff <(printf '%s\n' "$expected_markdown") <(printf '%s\n' "$actual_markdown") >&2 || true
        exit 1
    fi

    for forbidden in \
        'apps/api' \
        'working-dir the repository root' \
        'cd the repository root' \
        'release:check' \
        'publish-distribution' \
        'Packagist' \
        'incubat' \
        'GitHub Actions always runs' \
        'On pull requests, oasdiff compares' \
        'canonical release CI scans every production image'; do
        for markdown in "${expected_markdown_files[@]}"; do
            if grep --ignore-case --fixed-strings -- "$forbidden" "$markdown"; then
                echo "Consumer Markdown contains maintainer-only or invalid text: $forbidden" >&2
                exit 1
            fi
        done
    done

    docs_words=$(find docs -type f -name '*.md' -exec cat {} + | wc -w | tr -d ' ')
    if ((docs_words > 5000)); then
        echo "Consumer documentation exceeds 5000 words: $docs_words" >&2
        exit 1
    fi

    bun ci
    bun run config:check
    bun run contracts:check
    bun run audit
    bun run check
    bun run test:production
    test "$(php artisan migrate:status --no-ansi | grep -c '\[1\] Ran')" -eq \
        "$(find database/migrations -type f -name '*.php' | wc -l | tr -d ' ')"
)

seed=${GITHUB_RUN_ID:-$RANDOM}
ready=false

cd "$install_dir"
app_key_before=$(sed -n 's/^APP_KEY=//p' .env)

for launch_attempt in {1..3}; do
    port_base=""

    for port_attempt in {1..20}; do
        candidate=$((20000 + (seed + launch_attempt * 5003 + port_attempt * 97) % 9000))

        # PHP receives this program literally.
        # shellcheck disable=SC2016
        if php -r '
            $base = (int) $argv[1];
            for ($port = $base; $port < $base + 8; $port++) {
                $socket = @stream_socket_server("tcp://127.0.0.1:{$port}");
                if ($socket === false) exit(1);
                fclose($socket);
            }
        ' "$candidate"; then
            port_base=$candidate
            break
        fi
    done

    if [[ -z "$port_base" ]]; then
        continue
    fi

    export COMPOSE_PROJECT_NAME="$dev_project"
    export WEB_PUBLIC_PORT=$port_base
    export WEB_PORT=$((port_base + 1))
    export API_PORT=$((port_base + 2))
    export REVERB_PORT=$((port_base + 3))
    export POSTGRES_PORT=$((port_base + 4))
    export REDIS_PORT=$((port_base + 5))
    export MAILPIT_SMTP_PORT=$((port_base + 6))
    export MAILPIT_HTTP_PORT=$((port_base + 7))

    if command -v setsid >/dev/null 2>&1; then
        setsid composer run dev >distribution-dev.log 2>&1 &
    else
        perl -e 'use POSIX qw(setsid); setsid(); exec @ARGV' \
            composer run dev >distribution-dev.log 2>&1 &
    fi
    dev_pid=$!
    process_exited=false

    for _ in {1..60}; do
        if curl --connect-timeout 1 --fail --max-time 2 --silent \
            "http://127.0.0.1:$WEB_PUBLIC_PORT/up" >/dev/null; then
            ready=true
            break
        fi

        if ! kill -0 "$dev_pid" 2>/dev/null; then
            process_exited=true
            break
        fi

        sleep 2
    done

    if [[ "$ready" == true ]]; then
        break
    fi

    if [[ "$process_exited" != true ]]; then
        break
    fi

    stop_dev_stack
done

if [[ "$ready" != true ]]; then
    if [[ -f distribution-dev.log ]]; then
        sed -n '1,320p' distribution-dev.log >&2
    else
        echo 'Could not find eight free ports for the installed application.' >&2
    fi
    exit 1
fi

app_key_after=$(sed -n 's/^APP_KEY=//p' .env)
if [[ -z "$app_key_before" || "$app_key_after" != "$app_key_before" ]]; then
    echo 'composer run dev replaced the installed APP_KEY.' >&2
    exit 1
fi

curl --connect-timeout 2 --fail --max-time 10 --silent --show-error \
    "http://127.0.0.1:$WEB_PUBLIC_PORT/" >/dev/null

echo "Laravel Installer distribution smoke passed."
