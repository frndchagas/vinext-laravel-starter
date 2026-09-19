import { expect, test } from "bun:test";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(
  new URL("./build-distribution.mjs", import.meta.url),
);

test("distribution overrides come only from the archived commit", async () => {
  const source = await Bun.file(scriptPath).text();

  expect(source).toContain(
    'run("git", ["archive", "--format=tar", sourceRef, "-o", archive])',
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
  expect(source).toContain(
    'run("bun", ["dedupe", "--lockfile-only"], outputRoot)',
  );
});

test("local snapshots cannot claim release provenance", () => {
  for (const field of ["SOURCE_COMMIT", "SOURCE_TAG"]) {
    const result = Bun.spawnSync([process.execPath, scriptPath], {
      env: { ...process.env, SMOKE_SOURCE_REF: "HEAD", [field]: "release-provenance" },
      stdout: "pipe",
      stderr: "pipe",
    });
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr.toString()).toContain("only available for local validation, not releases");
  }
});
