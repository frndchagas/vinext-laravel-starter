#!/usr/bin/env bash

set -euo pipefail

source_tag=${1:?Usage: bun run release:check -- <vMAJOR.MINOR.PATCH>}
source_root=$(git rev-parse --show-toplevel)
cd "$source_root"

if [[ ! "$source_tag" =~ ^v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$ ]]; then
    echo "Stable release tags must use vMAJOR.MINOR.PATCH: $source_tag" >&2
    exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
    echo 'Release preflight requires a clean checkout.' >&2
    exit 1
fi

if [[ "$(git branch --show-current)" != main ]]; then
    echo 'Release preflight must run from main.' >&2
    exit 1
fi

git fetch origin main --tags
source_commit=$(git rev-parse HEAD)

if [[ "$source_commit" != "$(git rev-parse origin/main)" ]]; then
    echo 'Local main must match origin/main exactly.' >&2
    exit 1
fi

if git show-ref --verify --quiet "refs/tags/$source_tag"; then
    echo "Tag already exists: $source_tag" >&2
    exit 1
fi

if gh release view "$source_tag" >/dev/null 2>&1; then
    echo "GitHub Release already exists: $source_tag" >&2
    exit 1
fi

bun run scripts/verify-release-credentials.mjs
bash scripts/verify-main-ci.sh "$source_commit"

printf 'Release preflight passed for %s at %s.\n\n' "$source_tag" "$source_commit"
printf 'git tag --annotate %q --message %q\n' "$source_tag" "Release $source_tag"
printf 'git push origin %q\n' "refs/tags/$source_tag"
printf 'gh release create %q --verify-tag --generate-notes\n' "$source_tag"
