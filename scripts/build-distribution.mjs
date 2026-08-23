#!/usr/bin/env bun

import {
  cpSync,
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
  throw new Error("Usage: bun run scripts/build-distribution.mjs <empty-output-directory>");
}

if (existsSync(outputRoot)) {
  throw new Error(`Refusing to replace an existing path: ${outputRoot}`);
}

const scratch = mkdtempSync(join(tmpdir(), "vinext-distribution-"));
const archive = join(scratch, "source.tar");

function run(command, args, cwd = sourceRoot) {
  const result = Bun.spawnSync([command, ...args], {
    cwd,
    stdout: "inherit",
    stderr: "inherit",
  });

  if (result.exitCode !== 0) {
    throw new Error(`${command} ${args.join(" ")} exited with ${result.exitCode}`);
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

function rewriteMarkdown(path) {
  const contents = read(path)
    .replaceAll("`apps/api/", "`")
    .replaceAll("apps/api/", "")
    .replaceAll("`apps/api`", "the repository root")
    .replaceAll("apps/api", "the repository root");
  write(path, contents);
}

try {
  run("git", ["archive", "--format=tar", "HEAD", "-o", archive]);
  mkdirSync(outputRoot, { recursive: true });
  run("tar", ["-xf", archive, "-C", outputRoot]);

  const apiRoot = join(outputRoot, "apps/api");
  const rootGitignore = read(".gitignore").trim().split("\n");
  const apiGitignore = read("apps/api/.gitignore").trim().split("\n");
  const apiInstructions = read("apps/api/AGENTS.md");
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
  write(
    "AGENTS.md",
    `${read("AGENTS.md").trimEnd()}\n\n${apiInstructions.replace("# API instructions", "## Laravel API instructions").trim()}\n`,
  );

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
  packageJson.workspaces = packageJson.workspaces.filter((workspace) => workspace !== "apps/api");
  packageJson.devDependencies["@laravel/multiplex"] = "0.4.3";

  const workspaceScripts = {
    format: packageJson.scripts.format,
    "format:check": packageJson.scripts["format:check"],
    lint: packageJson.scripts.lint,
    test: packageJson.scripts.test,
  };
  const devEnvironment = packageJson.scripts.dev.split(" bun run --parallel")[0];

  packageJson.scripts.bootstrap = packageJson.scripts.bootstrap.replace(
    "composer --working-dir apps/api run setup",
    "composer run setup",
  );
  packageJson.scripts.dev = `${devEnvironment} bun run --parallel dev:web dev:api`;
  packageJson.scripts["dev:web"] = "bun run --filter web dev";
  packageJson.scripts["dev:api"] = "php artisan dev --inline";
  packageJson.scripts.format = "bun run --parallel format:php format:workspaces";
  packageJson.scripts["format:php"] = "vendor/bin/pint";
  packageJson.scripts["format:workspaces"] = workspaceScripts.format;
  packageJson.scripts["format:check"] =
    "bun run --parallel format:check:php format:check:workspaces";
  packageJson.scripts["format:check:php"] = "vendor/bin/pint --test";
  packageJson.scripts["format:check:workspaces"] = workspaceScripts["format:check"];
  packageJson.scripts.lint = "bun run --parallel lint:php lint:workspaces";
  packageJson.scripts["lint:php"] = "vendor/bin/phpstan analyse --no-progress --memory-limit=512M";
  packageJson.scripts["lint:workspaces"] = workspaceScripts.lint;
  packageJson.scripts.test = "bun run --parallel test:php test:workspaces";
  packageJson.scripts["test:php"] = "php artisan test";
  packageJson.scripts["test:workspaces"] = workspaceScripts.test;
  packageJson.scripts["config:check"] = packageJson.scripts["config:check"].replace(
    "composer --working-dir apps/api validate",
    "composer validate",
  );
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
    ['new URL("../../api/", import.meta.url)', 'new URL("../../../", import.meta.url)'],
  ]);
  replace(".dockerignore", [
    ["apps/api/vendor\n", "vendor\n"],
    ["apps/api/storage\n", "storage\n"],
  ]);
  replace("scripts/production-smoke.sh", [["apps/api/database/migrations", "database/migrations"]]);

  const dependabot = read(".github/dependabot.yml").replace("directory: /apps/api", "directory: /");
  rmSync(join(outputRoot, ".github"), { recursive: true, force: true });
  write(".github/dependabot.yml", dependabot);
  mkdirSync(join(outputRoot, ".github/workflows"), { recursive: true });
  cpSync(
    join(sourceRoot, "scripts/distribution/ci.yml"),
    join(outputRoot, ".github/workflows/ci.yml"),
  );

  cpSync(join(sourceRoot, "scripts/distribution/README.md"), join(outputRoot, "README.md"));
  cpSync(
    join(sourceRoot, "scripts/distribution/getting-started.md"),
    join(outputRoot, "docs/getting-started.md"),
  );

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

  for (const path of ["AGENTS.md", "CONTRIBUTING.md"]) {
    rewriteMarkdown(path);
  }

  const visitDocs = (relative) => {
    for (const entry of readdirSync(join(outputRoot, relative), { withFileTypes: true })) {
      const child = join(relative, entry.name);
      if (entry.isDirectory()) visitDocs(child);
      else if (entry.name.endsWith(".md")) rewriteMarkdown(child);
    }
  };
  visitDocs("docs");

  write(".source-commit", `${process.env.SOURCE_COMMIT ?? "development"}\n`);
  write(".source-tag", `${process.env.SOURCE_TAG ?? "development"}\n`);
} finally {
  rmSync(scratch, { recursive: true, force: true });
}

console.log(`Distribution written to ${outputRoot}`);
