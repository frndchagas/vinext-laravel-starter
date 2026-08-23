import { appendFileSync } from "node:fs";

const ALL_GATES = [
  "integration",
  "e2e",
  "template",
  "distribution",
  "production",
  "breaking",
  "docker",
];

const patterns = {
  integration: [
    /^apps\/api\/(app|bootstrap|config|database|public|routes|tests)\//,
    /^apps\/api\/composer\.(json|lock)$/,
    /^contracts\//,
  ],
  e2e: [
    /^apps\/web\//,
    /^apps\/api\/(app|bootstrap|config|database|public|routes)\//,
    /^apps\/api\/composer\.(json|lock)$/,
    /^contracts\//,
    /^packages\/api-client\//,
    /^compose\.yaml$/,
    /^infra\/caddy\//,
  ],
  template: [
    /^\.env\.example$/,
    /^\.gitignore$/,
    /^apps\/api\/\.env\.example$/,
    /^apps\/api\/composer\.(json|lock)$/,
    /^compose\.yaml$/,
    /^infra\/caddy\//,
    /^scripts\/template-smoke\.sh$/,
  ],
  distribution: [
    /^\.dockerignore$/,
    /^\.github\/dependabot\.yml$/,
    /^\.github\/workflows\/publish-distribution\.yml$/,
    /^\.gitignore$/,
    /^apps\/api\/(\.env\.example|\.gitignore|AGENTS\.md)$/,
    /^apps\/api\/composer\.(json|lock)$/,
    /^apps\/api\/public\//,
    /^apps\/web\/e2e\/helpers\.ts$/,
    /^infra\/docker\//,
    /^scripts\/(build-distribution\.mjs|contracts-check(?:\.test)?\.mjs|coolify-compose\.mjs|distribution-smoke\.sh|packagist-sync(?:\.test)?\.mjs|production-smoke\.sh|sync-distribution\.sh|distribution\/)/,
  ],
  production: [
    /^\.dockerignore$/,
    /^\.github\/dependabot\.yml$/,
    /^\.trivyignore\.yaml$/,
    /^\.env\.production\.example$/,
    /^apps\/api\/(app|bootstrap|config|database|public|routes)\//,
    /^apps\/api\/composer\.(json|lock)$/,
    /^apps\/web\//,
    /^compose\.(production|coolify)(\.local)?\.yaml$/,
    /^contracts\//,
    /^infra\/docker\//,
    /^packages\/api-client\//,
    /^scripts\/(postgres-|production-smoke|coolify-compose)/,
  ],
  breaking: [/^contracts\/http\//],
  docker: [
    /^\.dockerignore$/,
    /^\.github\/dependabot\.yml$/,
    /^\.trivyignore\.yaml$/,
    /^\.env\.production\.example$/,
    /^apps\/api\/composer\.(json|lock)$/,
    /^compose\.(production|coolify)(\.local)?\.yaml$/,
    /^infra\/docker\//,
  ],
};

const globalPaths = [/^bun\.lock$/, /^package\.json$/];

const controlPlanePaths = [
  /^\.github\/workflows\/ci\.yml$/,
  /^scripts\/ci-changes(?:\.test)?\.mjs$/,
  /^scripts\/ci-policy(?:\.test)?\.mjs$/,
  /^scripts\/packagist-sync(?:\.test)?\.mjs$/,
  /^scripts\/trivy-ignore\.test\.mjs$/,
  /^scripts\/verify-main-ci\.sh$/,
  /^scripts\/release-preflight\.sh$/,
];

export function classifyChanges(paths, forceFull = false) {
  const runEveryGate =
    forceFull || paths.some((path) => controlPlanePaths.some((pattern) => pattern.test(path)));
  const result = Object.fromEntries(ALL_GATES.map((gate) => [gate, runEveryGate]));

  if (runEveryGate) return result;

  for (const path of paths) {
    if (globalPaths.some((pattern) => pattern.test(path))) {
      for (const gate of ALL_GATES) result[gate] = true;
      continue;
    }

    for (const gate of ALL_GATES) {
      if (patterns[gate].some((pattern) => pattern.test(path))) result[gate] = true;
    }
  }

  return result;
}

function changedPaths(base, head) {
  const result = Bun.spawnSync(["git", "diff", "--name-only", base, head], {
    stdout: "pipe",
    stderr: "inherit",
  });

  if (result.exitCode !== 0) throw new Error(`git diff exited with ${result.exitCode}.`);

  return result.stdout
    .toString()
    .split("\n")
    .map((path) => path.trim())
    .filter(Boolean);
}

if (import.meta.main) {
  const forceFull = process.env.CI_FORCE_FULL === "true";
  const paths = forceFull ? [] : changedPaths(process.env.BASE_SHA, process.env.HEAD_SHA);
  const result = classifyChanges(paths, forceFull);
  const output = Object.entries(result)
    .map(([gate, enabled]) => `${gate}=${enabled}`)
    .join("\n");

  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${output}\n`);
  console.log(forceFull ? "Full CI requested." : `Changed paths:\n${paths.join("\n") || "(none)"}`);
  console.log(`Selected gates:\n${output}`);
}
