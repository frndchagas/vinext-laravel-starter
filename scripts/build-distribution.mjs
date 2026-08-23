#!/usr/bin/env bun

import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

const sourceRoot = process.cwd();
const outputRoot = resolve(process.argv[2] ?? "");

if (!process.argv[2]) {
  throw new Error(
    "Usage: bun run scripts/build-distribution.mjs <empty-output-directory>",
  );
}

if (existsSync(outputRoot)) {
  throw new Error(`Refusing to replace an existing path: ${outputRoot}`);
}

const scratch = mkdtempSync(join(tmpdir(), "vinext-distribution-"));
const archive = join(scratch, "source.tar");
const distributionDocs = [
  "docs/README.md",
  "docs/getting-started.md",
  "docs/customizing.md",
  "docs/troubleshooting.md",
  "docs/architecture.md",
  "docs/authentication.md",
  "docs/api-conventions.md",
  "docs/async-workflow.md",
  "docs/development.md",
  "docs/deployment.md",
];

function run(command, args, cwd = sourceRoot) {
  const result = Bun.spawnSync([command, ...args], {
    cwd,
    stdout: "inherit",
    stderr: "inherit",
  });

  if (result.exitCode !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} exited with ${result.exitCode}`,
    );
  }
}

function read(path) {
  return readFileSync(join(outputRoot, path), "utf8");
}

function write(path, contents) {
  const target = join(outputRoot, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, contents);
}

function replace(path, replacements) {
  let contents = read(path);

  for (const [from, to] of replacements) {
    if (!contents.includes(from)) {
      throw new Error(`Expected ${path} to contain: ${from}`);
    }
    contents = contents.replaceAll(from, to);
  }

  write(path, contents);
}

function markdownFiles(relative = "") {
  const files = [];

  for (const entry of readdirSync(join(outputRoot, relative), {
    withFileTypes: true,
  })) {
    const child = join(relative, entry.name);
    if (entry.isDirectory()) files.push(...markdownFiles(child));
    else if (entry.name.endsWith(".md")) files.push(child);
  }

  return files;
}

function validateMarkdownLinks() {
  const linkPattern = /!?\[[^\]]*\]\(([^)\s]+)(?:\s+["'][^)]*["'])?\)/g;

  for (const path of markdownFiles()) {
    for (const match of read(path).matchAll(linkPattern)) {
      const rawTarget = match[1].replace(/^<|>$/g, "");
      if (/^(?:[a-z][a-z0-9+.-]*:|#|\/)/i.test(rawTarget)) continue;

      const target = decodeURI(rawTarget.split(/[?#]/, 1)[0]);
      if (!target) continue;

      const resolved = resolve(outputRoot, dirname(path), target);
      if (!existsSync(resolved)) {
        throw new Error(`Broken Markdown link in ${path}: ${rawTarget}`);
      }
    }
  }
}

try {
  run("git", ["archive", "--format=tar", "HEAD", "-o", archive]);
  mkdirSync(outputRoot, { recursive: true });
  run("tar", ["-xf", archive, "-C", outputRoot]);

  const apiRoot = join(outputRoot, "apps/api");
  const rootGitignore = read(".gitignore").trim().split("\n");
  const apiGitignore = read("apps/api/.gitignore").trim().split("\n");
  const apiEnvironment = read("apps/api/.env.example");
  const apiEnvironmentKeys = new Set(
    apiEnvironment
      .split("\n")
      .map((line) => line.match(/^([A-Z][A-Z0-9_]*)=/)?.[1])
      .filter(Boolean),
  );
  const rootOnlyEnvironment = read(".env.example")
    .split("\n")
    .filter((line) => {
      const key = line.match(/^([A-Z][A-Z0-9_]*)=/)?.[1];
      return key !== undefined && !apiEnvironmentKeys.has(key);
    });

  for (const entry of [
    "app",
    "artisan",
    "bootstrap",
    "composer.json",
    "composer.lock",
    "config",
    "database",
    "phpstan.neon",
    "phpunit.xml",
    "public",
    "routes",
    "storage",
    "tests",
  ]) {
    renameSync(join(apiRoot, entry), join(outputRoot, entry));
  }

  write(
    ".env.example",
    `${apiEnvironment.trimEnd()}\n\n# Development ports\n${rootOnlyEnvironment.join("\n")}\n`,
  );
  replace(".env.example", [
    [
      "DB_CONNECTION=pgsql\nDB_HOST=127.0.0.1\nDB_PORT=15432\nDB_DATABASE=starter\nDB_USERNAME=starter\nDB_PASSWORD=starter",
      "DB_CONNECTION=sqlite\n# DB_HOST=127.0.0.1\n# DB_PORT=15432\n# DB_DATABASE=starter\n# DB_USERNAME=starter\n# DB_PASSWORD=starter",
    ],
    ["SESSION_DRIVER=redis", "SESSION_DRIVER=database"],
    ["BROADCAST_CONNECTION=reverb", "BROADCAST_CONNECTION=log"],
    ["QUEUE_CONNECTION=redis", "QUEUE_CONNECTION=database"],
    ["CACHE_STORE=redis", "CACHE_STORE=database"],
  ]);
  const gitignoreExceptions = ["!.env.example", "!.env.production.example"];
  const gitignore = [...new Set([...rootGitignore, ...apiGitignore])].filter(
    (entry) => !gitignoreExceptions.includes(entry),
  );
  write(".gitignore", `${[...gitignore, ...gitignoreExceptions].join("\n")}\n`);
  rmSync(apiRoot, { recursive: true, force: true });
  write("AGENTS.md", read("scripts/distribution/AGENTS.md"));
  write("CONTEXT.md", read("scripts/distribution/CONTEXT.md"));
  write("CONTRIBUTING.md", read("scripts/distribution/CONTRIBUTING.md"));
  write("SECURITY.md", read("scripts/distribution/SECURITY.md"));

  const composer = JSON.parse(read("composer.json"));
  composer.name = "frndchagas/vinext-laravel-starter";
  composer.description = "Laravel and Vinext foundation for coding agents.";
  composer.keywords = ["laravel", "vinext", "react", "starter-kit", "bun"];
  composer.homepage = "https://github.com/frndchagas/vinext-laravel-starter";
  composer.support = {
    issues: "https://github.com/frndchagas/vinext-laravel-starter/issues",
    source: "https://github.com/frndchagas/vinext-laravel-starter",
  };
  composer.scripts.dev = [
    "Composer\\Config::disableProcessTimeout",
    "bun run bootstrap && bun run dev",
  ];
  write("composer.json", `${JSON.stringify(composer, null, 4)}\n`);
  run(
    "composer",
    ["update", "--lock", "--no-install", "--no-interaction", "--no-scripts"],
    outputRoot,
  );

  const packageJson = JSON.parse(read("package.json"));
  packageJson.workspaces = packageJson.workspaces.filter(
    (workspace) => workspace !== "apps/api",
  );
  packageJson.devDependencies["@laravel/multiplex"] = "0.4.3";

  const workspaceScripts = {
    format: packageJson.scripts.format,
    "format:check": packageJson.scripts["format:check"],
    lint: packageJson.scripts.lint,
    test: packageJson.scripts.test,
  };
  const devEnvironment = packageJson.scripts.dev.split(
    " bun run --parallel",
  )[0];

  packageJson.scripts.bootstrap = packageJson.scripts.bootstrap.replace(
    "composer --working-dir apps/api run setup",
    "composer run setup",
  );
  packageJson.scripts.dev = `${devEnvironment} bun run --parallel dev:web dev:api`;
  packageJson.scripts["dev:web"] = "bun run --filter web dev";
  packageJson.scripts["dev:api"] = "php artisan dev --inline";
  packageJson.scripts.format =
    "bun run --parallel format:php format:workspaces";
  packageJson.scripts["format:php"] = "vendor/bin/pint";
  packageJson.scripts["format:workspaces"] = workspaceScripts.format;
  packageJson.scripts["format:check"] =
    "bun run --parallel format:check:php format:check:workspaces";
  packageJson.scripts["format:check:php"] = "vendor/bin/pint --test";
  packageJson.scripts["format:check:workspaces"] =
    workspaceScripts["format:check"];
  packageJson.scripts.lint = "bun run --parallel lint:php lint:workspaces";
  packageJson.scripts["lint:php"] =
    "vendor/bin/phpstan analyse --no-progress --memory-limit=512M";
  packageJson.scripts["lint:workspaces"] = workspaceScripts.lint;
  packageJson.scripts.test = "bun run --parallel test:php test:workspaces";
  packageJson.scripts["test:php"] = "php artisan test";
  packageJson.scripts["test:workspaces"] = workspaceScripts.test;
  packageJson.scripts["config:check"] = packageJson.scripts[
    "config:check"
  ].replace("composer --working-dir apps/api validate", "composer validate");
  packageJson.scripts.audit = packageJson.scripts.audit.replace(
    "composer audit --working-dir apps/api --locked",
    "composer audit --locked",
  );
  packageJson.scripts.check =
    "bun run config:check && bun run --parallel format:check lint typecheck test build";
  delete packageJson.scripts["test:distribution"];
  delete packageJson.scripts["test:template"];
  delete packageJson.scripts["release:check"];
  write("package.json", `${JSON.stringify(packageJson, null, 2)}\n`);
  run("bun", ["install", "--ignore-scripts"], outputRoot);

  replace("infra/docker/api/Dockerfile", [
    [
      "COPY apps/api/composer.json apps/api/composer.lock ./",
      "COPY composer.json composer.lock ./",
    ],
    [
      "COPY apps/api ./",
      [
        "COPY artisan ./",
        "COPY app ./app",
        "COPY bootstrap ./bootstrap",
        "COPY config ./config",
        "COPY database ./database",
        "COPY public ./public",
        "COPY routes ./routes",
      ].join("\n"),
    ],
  ]);
  replace("infra/docker/api-nginx/Dockerfile", [["apps/api/public", "public"]]);
  replace("infra/docker/web/Dockerfile", [
    ["COPY apps/api/package.json ./apps/api/package.json\n", ""],
  ]);
  replace("apps/web/e2e/helpers.ts", [
    [
      'new URL("../../api/", import.meta.url)',
      'new URL("../../../", import.meta.url)',
    ],
  ]);
  replace(".dockerignore", [
    ["apps/api/vendor\n", "vendor\n"],
    ["apps/api/storage\n", "storage\n"],
  ]);
  replace("scripts/production-smoke.sh", [
    ["apps/api/database/migrations", "database/migrations"],
  ]);

  const dependabot = read(".github/dependabot.yml").replace(
    "directory: /apps/api",
    "directory: /",
  );
  rmSync(join(outputRoot, ".github"), { recursive: true, force: true });
  write(".github/dependabot.yml", dependabot);
  write(".github/workflows/ci.yml", read("scripts/distribution/ci.yml"));
  write("README.md", read("scripts/distribution/README.md"));

  const archivedDocs = new Map(
    distributionDocs.map((path) => [path, read(path)]),
  );
  rmSync(join(outputRoot, "docs"), { recursive: true, force: true });
  for (const path of distributionDocs) write(path, archivedDocs.get(path));
  write("docs/README.md", read("scripts/distribution/docs-README.md"));
  write(
    "docs/getting-started.md",
    read("scripts/distribution/getting-started.md"),
  );
  write("docs/development.md", read("scripts/distribution/development.md"));

  replace("docs/api-conventions.md", [
    [
      "HTTP changes begin in TypeSpec and include regenerated OpenAPI, route-surface metadata and client artifacts. PHP tests compare contracted methods and paths with Laravel in both directions. On pull requests, oasdiff compares the proposed document with the target branch. This is not a comparison with the latest tagged release.",
      "HTTP changes begin in TypeSpec and include regenerated OpenAPI, route-surface metadata and client artifacts. PHP tests compare contracted methods and paths with Laravel in both directions. The included CI does not compare API compatibility with a tagged release; add oasdiff or an equivalent gate when the product needs that policy.",
    ],
  ]);
  replace("docs/architecture.md", [
    [
      "The starter has no AI provider, billing, teams or passkeys today.",
      "This application snapshot has no AI provider, billing, teams or passkeys.",
    ],
  ]);
  replace("docs/async-workflow.md", [
    [
      "The starter cannot promise exactly-once effects across a provider call and a process crash.",
      "The application cannot promise exactly-once effects across a provider call and a process crash.",
    ],
  ]);
  replace("docs/authentication.md", [
    ["cd apps/api\nphp artisan", "php artisan"],
  ]);
  replace("docs/customizing.md", [
    ["# Customize the starter", "# Customize the application"],
    [
      "The GitHub template gives each application its own history. There is no updater, so remove the starter identity before building product features.",
      "This application is an owned snapshot with its own history. There is no updater, so remove the starter identity before building product features.",
    ],
    [
      "Laravel application settings live in `apps/api/.env`; never commit either file.",
      "Laravel application settings live in the root `.env`; never commit it.",
    ],
  ]);
  replace("docs/deployment.md", [
    [
      "The canonical release CI scans every production image with Trivy and blocks fixable high and critical findings.",
      "The production images in this snapshot passed the canonical release Trivy gate for fixable high and critical findings. The application owner is responsible for scanning later dependency and image changes.",
    ],
    [
      "Roll back by selecting the previous source tag and redeploying it; do not roll back the database unless the migration has an explicit reversal plan.",
      "Roll back by selecting a known-good revision or application tag and redeploying it; do not roll back the database unless the migration has an explicit reversal plan.",
    ],
  ]);
  replace("docs/troubleshooting.md", [
    [
      "cd apps/api && php artisan about --only=environment",
      "php artisan about --only=environment",
    ],
    [
      "Laravel mail settings in `apps/api/.env`",
      "Laravel mail settings in `.env`",
    ],
    [
      "composer install --working-dir apps/api --no-interaction",
      "composer install --no-interaction",
    ],
  ]);

  for (const path of [
    "scripts/build-distribution.mjs",
    "scripts/ci-changes.mjs",
    "scripts/ci-changes.test.mjs",
    "scripts/ci-policy.mjs",
    "scripts/ci-policy.test.mjs",
    "scripts/distribution",
    "scripts/distribution-smoke.sh",
    "scripts/packagist-sync.mjs",
    "scripts/packagist-sync.test.mjs",
    "scripts/release-preflight.sh",
    "scripts/sync-distribution.sh",
    "scripts/template-smoke.sh",
    "scripts/trivy-ignore.test.mjs",
    "scripts/verify-main-ci.sh",
  ]) {
    rmSync(join(outputRoot, path), { recursive: true, force: true });
  }

  write(".source-commit", `${process.env.SOURCE_COMMIT ?? "development"}\n`);
  write(".source-tag", `${process.env.SOURCE_TAG ?? "development"}\n`);
  validateMarkdownLinks();
} finally {
  rmSync(scratch, { recursive: true, force: true });
}

console.log(`Distribution written to ${outputRoot}`);
