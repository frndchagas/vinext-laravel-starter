#!/usr/bin/env bash

set -euo pipefail

project_name="vinext-production-smoke-${GITHUB_RUN_ID:-$$}-${GITHUB_RUN_ATTEMPT:-1}"
image_tag="smoke-${GITHUB_RUN_ID:-$$}-${GITHUB_RUN_ATTEMPT:-1}"
production_port=${PRODUCTION_PORT:-14000}
cookie_jar=$(mktemp)
backup_root=$(mktemp -d)
backup_file="$backup_root/starter.dump"
headers_file="$backup_root/headers.txt"
home_body_file="$backup_root/home.html"
image_headers_file="$backup_root/image-headers.txt"
login_body_file="$backup_root/login.html"
readiness_body_file="$backup_root/readiness.json"
readiness_headers_file="$backup_root/readiness-headers.txt"
robots_body_file="$backup_root/robots.txt"

export APP_HOST="127.0.0.1:$production_port"
export APP_KEY
APP_KEY=$(php -r 'echo "base64:".base64_encode(random_bytes(32));')
export APP_NAME="Vinext production smoke"
export APP_DESCRIPTION="Production metadata smoke."
export APP_INDEXABLE=true
export APP_REPOSITORY_URL="https://github.com/frndchagas/vinext-laravel-starter"
export APP_SOCIAL_IMAGE="/opengraph-image.jpg"
export APP_URL="http://127.0.0.1:$production_port"
export FEATURE_REGISTRATION=true
export IMAGE_TAG="$image_tag"
export LEGACY_APP_HOST=legacy.example.invalid
export MAIL_MAILER=log
export POSTGRES_PASSWORD=smoke-password
export PRODUCTION_PORT="$production_port"
export REVERB_APP_ID=starter
export REVERB_APP_KEY=smoke-key
export REVERB_APP_SECRET=smoke-secret
export REVERB_ALLOWED_ORIGINS=127.0.0.1
export SESSION_SECURE_COOKIE=false
if [[ "${PRODUCTION_BROWSER_SMOKE:-false}" == true ]]; then
    export TASK_SIMULATED_DELAY_MS=2000
else
    export TASK_SIMULATED_DELAY_MS=0
fi
export COMPOSE_PROJECT_NAME="$project_name"
export COMPOSE_FILE="compose.production.yaml:compose.production.local.yaml"

compose=(
    docker compose
    --project-name "$project_name"
    --env-file .env.production.example
    --file compose.production.yaml
    --file compose.production.local.yaml
)

cleanup() {
    set +e
    "${compose[@]}" down --volumes --remove-orphans
    rm -f "$cookie_jar"
    rm -f \
        "$backup_file" \
        "$headers_file" \
        "$home_body_file" \
        "$image_headers_file" \
        "$login_body_file" \
        "$readiness_body_file" \
        "$readiness_headers_file" \
        "$robots_body_file"
    rmdir "$backup_root" 2>/dev/null || true
}

trap cleanup EXIT INT TERM

docker build \
    --file infra/docker/api/Dockerfile \
    --tag "vinext-laravel-starter-api:$image_tag" \
    .

docker build \
    --file infra/docker/api-nginx/Dockerfile \
    --tag "vinext-laravel-starter-api-nginx:$image_tag" \
    .

docker build \
    --file infra/docker/proxy/Dockerfile \
    --tag "vinext-laravel-starter-proxy:$image_tag" \
    .

docker build \
    --build-arg "NEXT_PUBLIC_REVERB_APP_KEY=$REVERB_APP_KEY" \
    --file infra/docker/web/Dockerfile \
    --tag "vinext-laravel-starter-web:$image_tag" \
    .

"${compose[@]}" up --detach --no-build --wait

postgres_image_id=$(docker inspect --format '{{.Image}}' "$("${compose[@]}" ps --quiet postgres)")
redis_image_id=$(docker inspect --format '{{.Image}}' "$("${compose[@]}" ps --quiet redis)")
docker tag "$postgres_image_id" "vinext-laravel-starter-postgres:$image_tag"
docker tag "$redis_image_id" "vinext-laravel-starter-redis:$image_tag"

curl --fail --silent --show-error \
    --dump-header "$headers_file" \
    --output "$home_body_file" \
    "$APP_URL/"
curl --fail --silent --show-error "$APP_URL/up" >/dev/null
curl --fail --silent --show-error --output "$login_body_file" "$APP_URL/login"
curl --fail --silent --show-error --output "$robots_body_file" "$APP_URL/robots.txt"
if [[ -n "$APP_SOCIAL_IMAGE" ]]; then
    curl --fail --silent --show-error \
        --dump-header "$image_headers_file" \
        --output /dev/null \
        "$APP_URL$APP_SOCIAL_IMAGE"
fi

if ! php -r '
        $home = file_get_contents($argv[1]);
        $login = file_get_contents($argv[2]);
        $robots = file_get_contents($argv[3]);
        $url = $argv[4];
        $repositoryUrl = $argv[5];
        $socialImage = $argv[6];
        $twitterCard = $socialImage === "" ? "summary" : "summary_large_image";
        $homePatterns = [
            "~<title>Vinext production smoke</title>~",
            "~<meta name=\"description\" content=\"Production metadata smoke\.\"\s*/>~",
            "~<meta name=\"robots\" content=\"(?:index, follow|follow, index)\"\s*/>~",
            "~<link rel=\"canonical\" href=\"".preg_quote($url, "~")."/?\"\s*/>~",
            "~<meta property=\"og:url\" content=\"".preg_quote($url, "~")."/?\"\s*/>~",
            "~<meta name=\"twitter:card\" content=\"".preg_quote($twitterCard, "~")."\"\s*/>~",
        ];
        if ($socialImage !== "") {
            $imageUrl = str_starts_with($socialImage, "/")
                ? rtrim($url, "/").$socialImage
                : $socialImage;
            $homePatterns[] = "~<meta property=\"og:image\" content=\"".preg_quote($imageUrl, "~")."\"\s*/>~";
        } elseif (str_contains($home, "property=\"og:image\"")) {
            exit(1);
        }
        if ($repositoryUrl !== "") {
            $homePatterns[] = "~href=\"".preg_quote($repositoryUrl, "~")."\"~";
        } elseif (str_contains($home, "github.com/frndchagas/vinext-laravel-starter")) {
            exit(1);
        }
        foreach ($homePatterns as $pattern) {
            if (preg_match($pattern, $home) !== 1) exit(1);
        }
        if (preg_match("~<meta name=\"robots\" content=\"nofollow, noindex\"\s*/>~", $login) !== 1) exit(1);
        if (!str_contains($robots, "User-Agent: *") || !str_contains($robots, "Allow: /")) exit(1);
    ' \
        "$home_body_file" \
        "$login_body_file" \
        "$robots_body_file" \
        "$APP_URL" \
        "$APP_REPOSITORY_URL" \
        "$APP_SOCIAL_IMAGE"; then
    echo "Production metadata did not match the configured public identity." >&2
    exit 1
fi

if [[ -n "$APP_SOCIAL_IMAGE" ]] && \
    ! grep --ignore-case --quiet '^Content-Type: image/jpeg' "$image_headers_file"; then
    echo "The Open Graph image was not served as JPEG." >&2
    exit 1
fi

readiness_status=$(curl --silent --show-error \
    --header 'Accept: application/json' \
    --dump-header "$readiness_headers_file" \
    --output "$readiness_body_file" \
    --write-out '%{http_code}' \
    "$APP_URL/ready")
if [[ "$readiness_status" != 200 ]]; then
    echo "/ready returned HTTP $readiness_status; expected 200." >&2
    exit 1
fi
if ! php -r '
        $data = json_decode(file_get_contents($argv[1]), true, flags: JSON_THROW_ON_ERROR);
        $valid = ($data["status"] ?? null) === "ready"
            && ($data["checks"]["database"] ?? null) === "ok"
            && ($data["checks"]["cache"] ?? null) === "ok";
        exit($valid ? 0 : 1);
    ' "$readiness_body_file"; then
    echo "/ready returned an invalid readiness document." >&2
    exit 1
fi
readiness_correlation_id=$(
    awk -F ': *' '
        tolower($1) == "x-correlation-id" {
            gsub(/\r/, "", $2);
            print $2;
            exit;
        }
    ' "$readiness_headers_file"
)
if [[ ! "$readiness_correlation_id" =~ ^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$ ]]; then
    echo "/ready returned an invalid X-Correlation-Id header." >&2
    exit 1
fi
if grep --ignore-case --quiet '^Set-Cookie:' "$readiness_headers_file"; then
    echo "/ready issued a session or CSRF cookie." >&2
    exit 1
fi
legacy_redirect=$(
    curl --silent --show-error --output /dev/null \
        --header "Host: $LEGACY_APP_HOST" \
        --write-out '%{http_code} %{redirect_url}' \
        "$APP_URL/legacy/path?from=smoke"
)
if [[ "$legacy_redirect" != "301 $APP_URL/legacy/path?from=smoke" ]]; then
    echo "Legacy host redirect was $legacy_redirect." >&2
    exit 1
fi

unexpected_host_status=$(curl --silent --show-error --output /dev/null \
    --header 'Host: unexpected.example.invalid' \
    --write-out '%{http_code}' \
    "$APP_URL/")
if [[ "$unexpected_host_status" != 421 ]]; then
    echo "Unexpected Host returned $unexpected_host_status; expected 421." >&2
    exit 1
fi

missing_port_status=$(curl --silent --show-error --output /dev/null \
    --header 'Host: 127.0.0.1' \
    --write-out '%{http_code}' \
    "$APP_URL/")
if [[ "$missing_port_status" != 421 ]]; then
    echo "Host without the configured port returned $missing_port_status; expected 421." >&2
    exit 1
fi

capabilities=$(
    curl --fail --silent --show-error "$APP_URL/api/v1/auth/capabilities"
)
php -r '
    $data = json_decode(stream_get_contents(STDIN), true, flags: JSON_THROW_ON_ERROR);
    exit(($data["registration"] ?? null) === true ? 0 : 1);
' <<<"$capabilities"

schedule=$(
    "${compose[@]}" exec -T api-php php artisan schedule:list --no-ansi
)
grep --quiet 'tasks:reconcile' <<<"$schedule"
grep --quiet 'horizon:snapshot' <<<"$schedule"
grep --quiet 'queue:prune-failed --hours=168' <<<"$schedule"

grep --ignore-case --quiet '^Content-Security-Policy:' "$headers_file"
grep --ignore-case --quiet '^Permissions-Policy:' "$headers_file"
grep --ignore-case --quiet '^Referrer-Policy: strict-origin-when-cross-origin' "$headers_file"
grep --ignore-case --quiet '^Strict-Transport-Security: max-age=31536000; includeSubDomains' "$headers_file"
grep --ignore-case --quiet '^X-Content-Type-Options: nosniff' "$headers_file"
grep --ignore-case --quiet '^X-Frame-Options: DENY' "$headers_file"

content_security_policy=$(
    awk '
        tolower($0) ~ /^content-security-policy:/ {
            sub(/^[^:]*:[[:space:]]*/, "");
            sub(/\r$/, "");
            print;
            exit;
        }
    ' "$headers_file"
)
if [[ "$content_security_policy" != *"connect-src 'self' ws://$APP_HOST wss://$APP_HOST;"* ]]; then
    echo "The CSP does not restrict WebSockets to APP_HOST." >&2
    exit 1
fi
if [[ "$content_security_policy" == *"connect-src 'self' ws: wss:;"* ]]; then
    echo "The CSP still allows WebSockets to arbitrary hosts." >&2
    exit 1
fi

if grep --ignore-case --quiet '^Server:' "$headers_file"; then
    echo "The public proxy exposed an upstream Server header." >&2
    exit 1
fi

if grep --ignore-case --quiet '^X-Powered-By:' "$headers_file"; then
    echo "The public proxy exposed an upstream X-Powered-By header." >&2
    exit 1
fi

me_status=$(curl --silent --output /dev/null --write-out '%{http_code}' "$APP_URL/api/v1/me")
if [[ "$me_status" != 401 ]]; then
    echo "Expected anonymous /api/v1/me to return 401, received $me_status." >&2
    exit 1
fi

expected_migrations=$(find apps/api/database/migrations -type f -name '*.php' | wc -l | tr -d ' ')
applied_migrations=$(
    "${compose[@]}" exec -T postgres \
        psql --username starter --dbname starter --tuples-only --no-align \
        --command 'select count(*) from migrations;'
)

if [[ "$applied_migrations" != "$expected_migrations" ]]; then
    echo "Expected $expected_migrations migrations, found $applied_migrations." >&2
    exit 1
fi

curl --fail --silent --show-error \
    --cookie-jar "$cookie_jar" \
    "$APP_URL/sanctum/csrf-cookie" >/dev/null

xsrf_token=$(awk '$6 == "XSRF-TOKEN" { print $7 }' "$cookie_jar" | tail -n 1)
decoded_xsrf_token=$(php -r "echo urldecode(\$argv[1]);" "$xsrf_token")

register_status=$(
    curl --silent --output /dev/null --write-out '%{http_code}' \
        --cookie "$cookie_jar" \
        --cookie-jar "$cookie_jar" \
        --header 'Accept: application/json' \
        --header 'Content-Type: application/json' \
        --header "Origin: $APP_URL" \
        --header "Referer: $APP_URL/" \
        --header "X-XSRF-TOKEN: $decoded_xsrf_token" \
        --request POST \
        --data '{"name":"Smoke User","email":"smoke@example.invalid","password":"smoke-password","password_confirmation":"smoke-password"}' \
        "$APP_URL/api/v1/auth/register"
)

if [[ "$register_status" != 201 ]]; then
    echo "Expected registration to return 201, received $register_status." >&2
    exit 1
fi

xsrf_token=$(awk '$6 == "XSRF-TOKEN" { print $7 }' "$cookie_jar" | tail -n 1)
decoded_xsrf_token=$(php -r "echo urldecode(\$argv[1]);" "$xsrf_token")

"${compose[@]}" exec -T postgres \
    psql --username starter --dbname starter \
    --command "update users set email_verified_at = now() where email = 'smoke@example.invalid';" \
    >/dev/null

task_response=$(
    curl --fail --silent --show-error \
        --cookie "$cookie_jar" \
        --header 'Accept: application/json' \
        --header 'Content-Type: application/json' \
        --header 'Idempotency-Key: production-smoke-task' \
        --header "Origin: $APP_URL" \
        --header "Referer: $APP_URL/" \
        --header "X-XSRF-TOKEN: $decoded_xsrf_token" \
        --request POST \
        --data '{"input":"production smoke"}' \
        "$APP_URL/api/v1/tasks"
)

task_id=$(php -r "\$data=json_decode(stream_get_contents(STDIN), true, flags: JSON_THROW_ON_ERROR); echo \$data['id'];" <<<"$task_response")

if [[ ! "$task_id" =~ ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$ ]]; then
    echo "Task API returned an invalid identifier: $task_id" >&2
    exit 1
fi

task_completed=false

for _ in {1..30}; do
    task_response=$(
        curl --fail --silent --show-error \
            --cookie "$cookie_jar" \
            --header 'Accept: application/json' \
            --header "Origin: $APP_URL" \
            --header "Referer: $APP_URL/" \
            "$APP_URL/api/v1/tasks/$task_id"
    )
    task_state=$(php -r "\$data=json_decode(stream_get_contents(STDIN), true, flags: JSON_THROW_ON_ERROR); echo \$data['state'];" <<<"$task_response")

    if [[ "$task_state" == completed ]]; then
        task_completed=true
        break
    fi

    sleep 1
done

if [[ "$task_completed" != true ]]; then
    echo "Task $task_id did not complete through Horizon." >&2
    exit 1
fi

if [[ "${PRODUCTION_BROWSER_SMOKE:-false}" == true ]]; then
    E2E_BASE_URL="$APP_URL" \
        E2E_PRODUCTION_EMAIL=smoke@example.invalid \
        E2E_PRODUCTION_PASSWORD=smoke-password \
        bun run --filter web test:e2e:production
fi

reconciled_task_id=$(
    "${compose[@]}" exec -T postgres \
        psql --username starter --dbname starter --quiet --tuples-only --no-align \
        --command "
            insert into tasks (
                id,
                user_id,
                input,
                state,
                version,
                correlation_id,
                created_at,
                updated_at
            )
            select
                gen_random_uuid(),
                id,
                'scheduler recovery',
                'queued',
                1,
                gen_random_uuid(),
                now() - interval '10 minutes',
                now() - interval '10 minutes'
            from users
            where email = 'smoke@example.invalid'
            returning id;
        " | sed -n '1p'
)

if [[ ! "$reconciled_task_id" =~ ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$ ]]; then
    echo "Could not create a queued Task for Scheduler recovery: $reconciled_task_id" >&2
    exit 1
fi

reconciled_task_completed=false
reconciled_task_version=""

for _ in {1..90}; do
    reconciled_task_result=$(
        "${compose[@]}" exec -T postgres \
            psql --username starter --dbname starter --tuples-only --no-align \
            --command "select state || ' ' || version from tasks where id = '$reconciled_task_id';"
    )
    read -r reconciled_task_state reconciled_task_version <<<"$reconciled_task_result"

    if [[ "$reconciled_task_state" == completed ]]; then
        reconciled_task_completed=true
        break
    fi

    sleep 1
done

if [[ "$reconciled_task_completed" != true || "$reconciled_task_version" != 3 ]]; then
    echo "Scheduler did not recover Task $reconciled_task_id; state=$reconciled_task_state version=$reconciled_task_version." >&2
    "${compose[@]}" logs --no-color --tail 200 scheduler worker >&2
    exit 1
fi

source_task_count=$(
    "${compose[@]}" exec -T postgres \
        psql --username starter --dbname starter --tuples-only --no-align \
        --command 'select count(*) from tasks;'
)

bash scripts/postgres-backup.sh "$backup_file"
bash scripts/postgres-restore.sh "$backup_file" starter_restore

restored_migrations=$(
    "${compose[@]}" exec -T postgres \
        psql --username starter --dbname starter_restore --tuples-only --no-align \
        --command 'select count(*) from migrations;'
)
restored_task_count=$(
    "${compose[@]}" exec -T postgres \
        psql --username starter --dbname starter_restore --tuples-only --no-align \
        --command 'select count(*) from tasks;'
)
restored_task_state=$(
    "${compose[@]}" exec -T postgres \
        psql --username starter --dbname starter_restore --tuples-only --no-align \
        --command "select state from tasks where id = '$task_id';"
)
restored_user_count=$(
    "${compose[@]}" exec -T postgres \
        psql --username starter --dbname starter_restore --tuples-only --no-align \
        --command "select count(*) from users where email = 'smoke@example.invalid';"
)

if [[ "$restored_migrations" != "$applied_migrations" ]]; then
    echo "Restore has $restored_migrations migrations; expected $applied_migrations." >&2
    exit 1
fi

if [[ "$restored_task_count" != "$source_task_count" ]]; then
    echo "Restore has $restored_task_count Tasks; expected $source_task_count." >&2
    exit 1
fi

if [[ "$restored_task_state" != completed ]]; then
    echo "Restored Task $task_id is $restored_task_state; expected completed." >&2
    exit 1
fi

if [[ "$restored_user_count" != 1 ]]; then
    echo "Restore did not preserve the smoke User." >&2
    exit 1
fi

echo "Production smoke passed with public metadata, stateless readiness, security headers, legacy redirect, $applied_migrations migrations, direct and Scheduler-recovered Tasks, and a restored PostgreSQL backup."
