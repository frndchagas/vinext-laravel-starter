import { expect, test } from "bun:test";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(
  new URL("./build-distribution.mjs", import.meta.url),
);

test("distribution overrides come only from the archived commit", async () => {
  const source = await Bun.file(scriptPath).text();

  expect(source).toContain(
    'run("git", ["archive", "--format=tar", "HEAD", "-o", archive])',
  );
  expect(source).not.toContain("cpSync");
  expect(source).not.toContain("join(sourceRoot");

  for (const asset of [
    "AGENTS.md",
    "CONTEXT.md",
    "CONTRIBUTING.md",
    "README.md",
    "SECURITY.md",
    "ci.yml",
    "development.md",
    "docs-README.md",
    "getting-started.md",
  ]) {
    expect(source).toContain(`read("scripts/distribution/${asset}")`);
  }
});

test("lock generation does not populate dependency trees", async () => {
  const source = await Bun.file(scriptPath).text();

  expect(source).toContain(
    'run("bun", ["install", "--lockfile-only", "--ignore-scripts"], outputRoot)',
  );
});
