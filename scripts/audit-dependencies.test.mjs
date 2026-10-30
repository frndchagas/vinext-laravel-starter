import { afterEach, expect, test } from "bun:test";
import { chmodSync, cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const source = fileURLToPath(new URL("../", import.meta.url));
const fixtures = [];
const finding = (severity) => ({
  url: "https://github.com/advisories/GHSA-abcd-efgh-ijkl",
  severity,
});

afterEach(() => {
  for (const fixture of fixtures.splice(0)) rmSync(fixture, { recursive: true, force: true });
});

// A fake `bun` on PATH answers `bun audit --json` with the given report and exit status.
function fixture(report, status = 1) {
  const root = mkdtempSync(join(tmpdir(), "dependency-audit-test-"));
  fixtures.push(root);
  mkdirSync(join(root, "scripts"));
  mkdirSync(join(root, "bin"));
  cpSync(join(source, "scripts/audit-dependencies.mjs"), join(root, "scripts/audit-dependencies.mjs"));
  writeFileSync(
    join(root, "audit.json"),
    typeof report === "string" ? report : JSON.stringify(report),
  );
  writeFileSync(join(root, "audit.status"), String(status));
  writeFileSync(
    join(root, "bin/bun"),
    `#!${process.execPath}\nimport {readFileSync} from 'node:fs';\nconsole.log(readFileSync('audit.json','utf8'));\nprocess.exit(Number(readFileSync('audit.status','utf8')));\n`,
  );
  chmodSync(join(root, "bin/bun"), 0o755);
  return root;
}

function run(root) {
  const result = Bun.spawnSync([process.execPath, join(root, "scripts/audit-dependencies.mjs")], {
    cwd: root,
    env: { ...process.env, PATH: `${join(root, "bin")}:${process.env.PATH}` },
    stdout: "pipe",
    stderr: "pipe",
    timeout: 10_000,
  });
  return { status: result.exitCode, output: result.stdout.toString() + result.stderr.toString() };
}

test("a clean audit passes", () => {
  expect(run(fixture({}, 0)).status).toBe(0);
});

test("high and critical findings block", () => {
  for (const severity of ["high", "critical"]) {
    const result = run(fixture({ other: [finding(severity)] }));
    expect(result.status).toBe(1);
    expect(result.output).toContain(`${severity.toUpperCase()} other:`);
  }
});

test("low and moderate findings are reported without failing", () => {
  const result = run(fixture({ low: [finding("low")], moderate: [finding("moderate")] }));
  expect(result.status).toBe(0);
  expect(result.output).toContain("LOW low:");
  expect(result.output).toContain("MODERATE moderate:");
});

test("audit fails closed on malformed, unknown or empty failed reports", () => {
  for (const report of [
    null,
    [],
    { other: [finding("unknown")] },
    { other: [{ severity: "high" }] },
    { other: "not an array" },
    {},
  ]) {
    expect(run(fixture(report)).status).toBe(1);
  }
  expect(run(fixture("network failure")).status).toBe(1);
  expect(run(fixture({ other: [finding("low")] }, 2)).status).toBe(1);
});
