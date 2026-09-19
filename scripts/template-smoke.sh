#!/usr/bin/env bash

set -euo pipefail

source_root=$(git rev-parse --show-toplevel)
template_root=$(mktemp -d)
archive_file=$(mktemp)
project_name="vinext-template-smoke-${GITHUB_RUN_ID:-$$}-${GITHUB_RUN_ATTEMPT:-1}"
dev_pid=""
dev_process_group=false

if [[ -n "${SMOKE_PORT_BASE:-}" ]]; then
    port_base=$SMOKE_PORT_BASE
else
    port_base=""

    seed=${GITHUB_RUN_ID:-$RANDOM}

    for attempt in {1..20}; do
        candidate=$((20000 + (seed + attempt * 97) % 39000))

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
        echo "Could not find eight free ports for the template smoke." >&2
        exit 1
    fi
fi

cleanup() {
    set +e

    if [[ -n "$dev_pid" ]]; then
        if [[ "$dev_process_group" == true ]]; then
            kill -TERM -- "-$dev_pid" 2>/dev/null
        else
            kill -TERM "$dev_pid" 2>/dev/null
        fi

        for _ in {1..50}; do
            if ! kill -0 -- "-$dev_pid" 2>/dev/null; then
                break
            fi
            sleep 0.1
        done

        kill -KILL -- "-$dev_pid" 2>/dev/null
        wait "$dev_pid" 2>/dev/null
    fi

    if [[ -n "$archive_file" ]]; then
        rm -f -- "$archive_file"
    fi

    if [[ -d "$template_root" ]]; then
        (
            cd "$template_root"
            docker compose --project-name "$project_name" down --volumes --remove-orphans
        )

        for _ in {1..20}; do
            find "$template_root" -mindepth 1 -delete
            if rmdir "$template_root" 2>/dev/null; then
                break
            fi
            sleep 0.1
        done

        if [[ -d "$template_root" ]]; then
            echo "Could not remove temporary template directory: $template_root" >&2
            return 1
        fi
    fi
}

trap cleanup EXIT INT TERM

git -C "$source_root" archive --format=tar "${SMOKE_SOURCE_REF:-HEAD}" --output "$archive_file"
tar -xf "$archive_file" -C "$template_root"
rm -f -- "$archive_file"
archive_file=""

cd "$template_root"
git init --quiet --initial-branch=main
git config user.email "template-smoke@example.invalid"
git config user.name "Template smoke"
git add --all
git commit --quiet --message "Initial template snapshot"
cp .env.example .env

export COMPOSE_PROJECT_NAME="$project_name"
export WEB_PUBLIC_PORT=$port_base
export WEB_PORT=$((port_base + 1))
export API_PORT=$((port_base + 2))
export REVERB_PORT=$((port_base + 3))
export POSTGRES_PORT=$((port_base + 4))
export REDIS_PORT=$((port_base + 5))
export MAILPIT_SMTP_PORT=$((port_base + 6))
export MAILPIT_HTTP_PORT=$((port_base + 7))

bun run bootstrap
app_key_before=$(sed -n 's/^APP_KEY=//p' apps/api/.env)

if [[ -z "$app_key_before" ]]; then
    echo 'Bootstrap did not generate APP_KEY.' >&2
    exit 1
fi

bun run bootstrap
app_key_after=$(sed -n 's/^APP_KEY=//p' apps/api/.env)

if [[ "$app_key_after" != "$app_key_before" ]]; then
    echo 'Bootstrap replaced the existing APP_KEY.' >&2
    exit 1
fi

bun run contracts:check
bun run check

expected_migrations=$(find apps/api/database/migrations -type f -name '*.php' | wc -l | tr -d ' ')
applied_migrations=$(
    docker compose exec -T postgres \
        psql --username starter --dbname starter --tuples-only --no-align \
        --command 'select count(*) from migrations;'
)

if [[ "$applied_migrations" != "$expected_migrations" ]]; then
    echo "Expected $expected_migrations migrations, found $applied_migrations." >&2
    exit 1
fi

docker compose exec -T redis redis-cli ping | grep --quiet '^PONG$'
curl --fail --silent --show-error "http://127.0.0.1:$MAILPIT_HTTP_PORT/readyz" >/dev/null

if command -v setsid >/dev/null 2>&1; then
    setsid bun run dev >template-smoke-dev.log 2>&1 &
else
    perl -e 'use POSIX qw(setsid); setsid(); exec @ARGV' \
        bun run dev >template-smoke-dev.log 2>&1 &
fi
dev_pid=$!
dev_process_group=true

ready=false
for _ in {1..60}; do
    if curl --fail --silent "http://127.0.0.1:$WEB_PUBLIC_PORT/up" >/dev/null; then
        ready=true
        break
    fi
    sleep 2
done

if [[ "$ready" != true ]]; then
    sed -n '1,320p' template-smoke-dev.log >&2
    exit 1
fi

curl --fail --silent --show-error "http://127.0.0.1:$WEB_PUBLIC_PORT/" >/dev/null

me_status=$(
    curl --silent --output /dev/null --write-out '%{http_code}' \
        "http://127.0.0.1:$WEB_PUBLIC_PORT/api/v1/me"
)

if [[ "$me_status" != 401 ]]; then
    echo "Expected /api/v1/me to return 401, received $me_status." >&2
    exit 1
fi

if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
    echo 'The fresh template changed tracked files:' >&2
    git status --short >&2
    exit 1
fi

echo "Fresh template smoke passed with $applied_migrations migrations on port base $port_base."
