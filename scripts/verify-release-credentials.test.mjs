import { describe, expect, test } from "bun:test";
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  inspectReleaseCredentials,
  listEnvironmentSecrets,
  parseSecretNames,
  runCli,
} from "./verify-release-credentials.mjs";

const scriptPath = fileURLToPath(
  new URL("./verify-release-credentials.mjs", import.meta.url),
);

function configuredSecrets(environment) {
  return new Set(
    environment === "distribution"
      ? ["DISTRIBUTION_DEPLOY_KEY"]
      : ["PACKAGIST_SAFE_TOKEN"],
  );
}

describe("release credential preflight", () => {
  test("accepts the two isolated environment credentials", () => {
    expect(inspectReleaseCredentials(configuredSecrets)).toEqual([
      { environment: "distribution", missing: [], unexpected: [] },
      { environment: "packagist", missing: [], unexpected: [] },
    ]);
    expect(runCli(configuredSecrets)).toBe(
      "Release credential names are isolated in their expected environments; values were not inspected.",
    );
  });

  test("reports every missing environment credential without reading values", () => {
    expect(inspectReleaseCredentials(() => new Set())).toEqual([
      {
        environment: "distribution",
        missing: ["DISTRIBUTION_DEPLOY_KEY"],
        unexpected: [],
      },
      {
        environment: "packagist",
        missing: ["PACKAGIST_SAFE_TOKEN"],
        unexpected: [],
      },
    ]);

    expect(() => runCli(() => new Set())).toThrow(
      "distribution is missing DISTRIBUTION_DEPLOY_KEY; packagist is missing PACKAGIST_SAFE_TOKEN",
    );
  });

  test("rejects extra or crossed credentials", () => {
    const crossedSecrets = (environment) =>
      new Set(
        environment === "distribution"
          ? ["DISTRIBUTION_DEPLOY_KEY", "PACKAGIST_SAFE_TOKEN"]
          : ["PACKAGIST_SAFE_TOKEN", "MAIN_TOKEN"],
      );

    expect(() => runCli(crossedSecrets)).toThrow(
      "distribution contains unexpected PACKAGIST_SAFE_TOKEN; packagist contains unexpected MAIN_TOKEN",
    );
  });

  test("validates GitHub metadata and fails closed on CLI errors", () => {
    expect(
      parseSecretNames('[{"name":"PACKAGIST_SAFE_TOKEN"}]', "packagist"),
    ).toEqual(new Set(["PACKAGIST_SAFE_TOKEN"]));
    expect(() => parseSecretNames("not-json", "packagist")).toThrow(
      "invalid secret metadata",
    );
    expect(() =>
      listEnvironmentSecrets("packagist", () => ({
        error: undefined,
        status: 1,
        stdout: "",
      })),
    ).toThrow("Could not inspect GitHub environment packagist");
  });

  test("requests only secret names and executes under Bun and Node", () => {
    const calls = [];
    const names = listEnvironmentSecrets(
      "packagist",
      (command, args, options) => {
        calls.push({ command, args, options });
        return {
          error: undefined,
          status: 0,
          stdout: '[{"name":"PACKAGIST_SAFE_TOKEN"}]',
        };
      },
    );

    expect(names).toEqual(new Set(["PACKAGIST_SAFE_TOKEN"]));
    expect(calls).toEqual([
      {
        command: "gh",
        args: ["secret", "list", "--env", "packagist", "--json", "name"],
        options: { encoding: "utf8" },
      },
    ]);

    const temporaryRoot = mkdtempSync(
      join(tmpdir(), "release-credential-preflight-"),
    );
    const fakeGh = join(temporaryRoot, "gh");

    try {
      writeFileSync(
        fakeGh,
        `#!/usr/bin/env node
const environment = process.argv[process.argv.indexOf("--env") + 1];
const name = environment === "distribution"
  ? "DISTRIBUTION_DEPLOY_KEY"
  : "PACKAGIST_SAFE_TOKEN";
process.stdout.write(JSON.stringify([{ name }]));
`,
      );
      chmodSync(fakeGh, 0o755);

      for (const runtime of ["bun", "node"]) {
        const result = Bun.spawnSync([runtime, scriptPath], {
          env: {
            ...process.env,
            PATH: `${temporaryRoot}:${process.env.PATH}`,
          },
          stderr: "pipe",
          stdout: "pipe",
        });

        expect(result.exitCode).toBe(0);
        expect(result.stderr.toString()).toBe("");
        expect(result.stdout.toString().trim()).toBe(
          "Release credential names are isolated in their expected environments; values were not inspected.",
        );
      }
    } finally {
      rmSync(temporaryRoot, { force: true, recursive: true });
    }
  });
});
