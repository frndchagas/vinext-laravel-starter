#!/usr/bin/env bun

import { createHash } from "node:crypto";
import { lstatSync, readFileSync, readdirSync, readlinkSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

export const GENERATED_CONTRACT_PATHS = [
  "contracts/http/generated",
  "contracts/http/openapi",
  "contracts/realtime/generated",
  "packages/api-client/src/generated",
];

function portablePath(path) {
  return path.split(sep).join("/");
}

function visit(root, path, snapshot) {
  const metadata = lstatSync(path);
  const key = portablePath(relative(root, path));

  if (metadata.isDirectory()) {
    for (const entry of readdirSync(path).sort())
      visit(root, join(path, entry), snapshot);
    return;
  }

  if (metadata.isSymbolicLink()) {
    snapshot.set(key, `symlink:${readlinkSync(path)}`);
    return;
  }

  const digest = createHash("sha256").update(readFileSync(path)).digest("hex");
  snapshot.set(key, digest);
}

export function snapshotGeneratedContracts(root = process.cwd()) {
  const snapshot = new Map();

  for (const path of GENERATED_CONTRACT_PATHS)
    visit(root, resolve(root, path), snapshot);

  return snapshot;
}

export function findSnapshotDrift(before, after) {
  const paths = new Set([...before.keys(), ...after.keys()]);

  return [...paths]
    .filter((path) => before.get(path) !== after.get(path))
    .sort();
}

function run(command, args, cwd) {
  const result = Bun.spawnSync([command, ...args], {
    cwd,
    stdout: "inherit",
    stderr: "inherit",
  });

  if (result.exitCode !== 0) process.exit(result.exitCode ?? 1);
}

function trackedGitDrift(root) {
  const workTree = Bun.spawnSync(
    ["git", "rev-parse", "--is-inside-work-tree"],
    {
      cwd: root,
      stdout: "pipe",
      stderr: "ignore",
    },
  );

  if (workTree.exitCode !== 0 || workTree.stdout.toString().trim() !== "true")
    return [];

  const result = Bun.spawnSync(
    ["git", "diff", "--name-only", "--", ...GENERATED_CONTRACT_PATHS],
    {
      cwd: root,
      stdout: "pipe",
      stderr: "inherit",
    },
  );

  if (result.exitCode !== 0) process.exit(result.exitCode ?? 1);

  return result.stdout
    .toString()
    .split("\n")
    .map((path) => path.trim())
    .filter(Boolean);
}

if (import.meta.main) {
  const root = process.cwd();

  run("bun", ["run", "contracts:validate"], root);
  const before = snapshotGeneratedContracts(root);
  run("bun", ["run", "contracts:build"], root);

  const drift = [
    ...new Set([
      ...findSnapshotDrift(before, snapshotGeneratedContracts(root)),
      ...trackedGitDrift(root),
    ]),
  ].sort();

  if (drift.length > 0) {
    console.error(
      `Contract artifacts drifted:\n${drift.map((path) => `- ${path}`).join("\n")}`,
    );
    console.error(
      "Run bun run contracts:build and commit the generated artifacts.",
    );
    process.exit(1);
  }

  console.log("Contract artifacts match the generated output.");
}
