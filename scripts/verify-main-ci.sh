#!/usr/bin/env bash

set -euo pipefail

source_commit=${1:?Usage: scripts/verify-main-ci.sh <full-commit-sha>}
repository=${GITHUB_REPOSITORY:-$(gh repo view --json nameWithOwner --jq .nameWithOwner)}

if [[ ! "$source_commit" =~ ^[0-9a-f]{40}$ ]]; then
    echo "Expected a full lowercase commit SHA, received: $source_commit" >&2
    exit 1
fi

run=$(
    gh api --method GET \
        "repos/$repository/actions/workflows/ci.yml/runs" \
        --field branch=main \
        --field event=push \
        --field head_sha="$source_commit" \
        --field status=success \
        --field per_page=100 \
        | jq --compact-output \
        --arg commit "$source_commit" \
        '[.workflow_runs[] | select(
            .head_sha == $commit
            and .head_branch == "main"
            and .event == "push"
            and .conclusion == "success"
        )][0] | if . == null then empty else {id, url: .html_url} end'
)

if [[ -z "$run" ]]; then
    echo "No successful full main CI run exists for $source_commit." >&2
    exit 1
fi

run_id=$(printf '%s\n' "$run" | jq --raw-output '.id')
run_url=$(printf '%s\n' "$run" | jq --raw-output '.url')

gh api --method GET \
    "repos/$repository/actions/runs/$run_id/jobs" \
    --field filter=latest \
    --field per_page=100 \
    | node scripts/ci-policy.mjs main-jobs

echo "Full main CI passed for $source_commit: $run_url"
