import { expect, test } from "bun:test";
import { fileURLToPath } from "node:url";
import { installedBraces } from "./installed-braces.mjs";

test("the installed braces API preserves normal patterns and rejects deep strings, ASTs and cycles", () => {
  const packages = installedBraces(fileURLToPath(new URL("../", import.meta.url)));
  expect(packages.length).toBeGreaterThan(0);
  for (const packageRoot of packages) {
    const result = Bun.spawnSync(
      ["node", fileURLToPath(new URL("./braces-security-check.mjs", import.meta.url)), packageRoot],
      { stdout: "pipe", stderr: "pipe", timeout: 10_000 },
    );
    expect(result.stderr.toString()).toBe("");
    expect(result.exitCode).toBe(0);
  }
});
