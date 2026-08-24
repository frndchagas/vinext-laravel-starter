import { describe, expect, test } from "bun:test";
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { MAIN_SKIPPED_JOBS, MAIN_SUCCESS_JOBS } from "./ci-policy.mjs";

const sourceCommit = "6078f9a09adaad3cba76d9dbe56dd2572c9f2ade";
const scriptPath = fileURLToPath(
  new URL("./verify-main-ci.sh", import.meta.url),
);

describe("main CI verification", () => {
  test("streams large GitHub payloads without blocking Bash", () => {
    const temporaryRoot = mkdtempSync(join(tmpdir(), "verify-main-ci-"));
    const fakeGh = join(temporaryRoot, "gh");

    try {
      writeFileSync(
        fakeGh,
        `#!/usr/bin/env node
const endpoint = process.argv.find((argument) => argument.startsWith("repos/"));
const padding = "x".repeat(256 * 1024);

if (endpoint.includes("actions/workflows/ci.yml/runs")) {
  process.stdout.write(JSON.stringify({
    workflow_runs: [{
      id: 123,
      head_sha: process.env.TEST_SOURCE_COMMIT,
      head_branch: "main",
      event: "push",
      conclusion: "success",
      html_url: "https://github.com/example/actions/runs/123",
      padding,
    }],
  }));
} else if (endpoint.includes("actions/runs/123/jobs")) {
  const successful = JSON.parse(process.env.TEST_MAIN_SUCCESS_JOBS);
  const skipped = JSON.parse(process.env.TEST_MAIN_SKIPPED_JOBS);
  process.stdout.write(JSON.stringify({
    jobs: [
      ...successful.map((name) => ({ name, conclusion: "success", padding })),
      ...skipped.map((name) => ({ name, conclusion: "skipped", padding })),
    ],
  }));
} else {
  process.stderr.write("Unexpected gh endpoint");
  process.exitCode = 1;
}
`,
      );
      chmodSync(fakeGh, 0o755);

      const result = spawnSync("/bin/bash", [scriptPath, sourceCommit], {
        encoding: "utf8",
        env: {
          ...process.env,
          GITHUB_REPOSITORY: "frndchagas/vinext-laravel-starter",
          PATH: `${temporaryRoot}:${process.env.PATH}`,
          TEST_MAIN_SKIPPED_JOBS: JSON.stringify(MAIN_SKIPPED_JOBS),
          TEST_MAIN_SUCCESS_JOBS: JSON.stringify(MAIN_SUCCESS_JOBS),
          TEST_SOURCE_COMMIT: sourceCommit,
        },
        timeout: 5_000,
      });

      expect(result.error).toBeUndefined();
      expect(result.status).toBe(0);
      expect(result.stderr).toBe("");
      expect(result.stdout).toContain("Full main CI job policy passed.");
      expect(result.stdout).toContain(
        `Full main CI passed for ${sourceCommit}: https://github.com/example/actions/runs/123`,
      );
    } finally {
      rmSync(temporaryRoot, { force: true, recursive: true });
    }
  });
});
