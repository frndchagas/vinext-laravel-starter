import { afterEach, expect, test } from "bun:test";
import {
  chmodSync,
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { installedBraces } from "./installed-braces.mjs";

const source = fileURLToPath(new URL("../", import.meta.url));
const installed = installedBraces(source)[0];
const fixtures = [];
const advisory = "https://github.com/advisories/GHSA-vfj7-8cjw-p6xm";
const finding = { url: advisory, severity: "high", vulnerable_versions: "<=3.0.3" };

afterEach(() => {
  for (const fixture of fixtures.splice(0)) rmSync(fixture, { recursive: true, force: true });
});

function fixture(report = { braces: [finding] }) {
  const root = mkdtempSync(join(tmpdir(), "braces-audit-test-"));
  fixtures.push(root);
  mkdirSync(join(root, "scripts"));
  mkdirSync(join(root, "patches"));
  mkdirSync(join(root, "bin"));
  for (const file of [
    "audit-dependencies.mjs",
    "installed-braces.mjs",
    "braces-security-check.mjs",
    "braces-mitigation.json",
  ])
    cpSync(join(source, "scripts", file), join(root, "scripts", file));
  cpSync(join(source, "patches/braces@3.0.3.patch"), join(root, "patches/braces@3.0.3.patch"));
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify({ patchedDependencies: { "braces@3.0.3": "patches/braces@3.0.3.patch" } }),
  );
  writeFileSync(
    join(root, "bun.lock"),
    JSON.stringify({
      patchedDependencies: { "braces@3.0.3": "patches/braces@3.0.3.patch" },
      packages: { braces: ["braces@3.0.3"] },
    }),
  );
  const copied = new Set();
  function copyPackage(packageRoot) {
    const pkg = JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8"));
    if (copied.has(pkg.name)) return;
    copied.add(pkg.name);
    cpSync(packageRoot, join(root, "node_modules", pkg.name), { recursive: true });
    const require = createRequire(join(packageRoot, "index.js"));
    for (const name of Object.keys(pkg.dependencies ?? {}))
      copyPackage(dirname(require.resolve(`${name}/package.json`)));
  }
  copyPackage(installed);
  writeFileSync(join(root, "audit.json"), JSON.stringify(report));
  writeFileSync(
    join(root, "bin/bun"),
    `#!${process.execPath}\nimport {readFileSync} from 'node:fs';\nconsole.log(readFileSync('audit.json','utf8'));\nprocess.exit(Number(readFileSync('audit.status','utf8')));\n`,
  );
  writeFileSync(join(root, "audit.status"), "1");
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

function expectBlocked(root, message) {
  const result = run(root);
  expect(result.status).toBe(1);
  expect(result.output).toContain(message);
}

test("audit accepts only the installed, registered and verified braces mitigation", () => {
  const result = run(fixture());
  expect(result.status).toBe(0);
  expect(result.output).toContain(`MITIGATED braces: ${advisory}`);
});

test("audit keeps unrelated high and critical findings blocking", () => {
  for (const severity of ["high", "critical"]) {
    const result = run(
      fixture({
        braces: [finding],
        other: [{ url: "https://github.com/advisories/GHSA-abcd-efgh-ijkl", severity }],
      }),
    );
    expect(result.status).toBe(1);
    expect(result.output).toContain(`${severity.toUpperCase()} other:`);
  }
});

test("audit preserves the high threshold and reports moderate findings", () => {
  const result = run(
    fixture({
      braces: [finding],
      other: [{ url: "https://github.com/advisories/GHSA-abcd-efgh-ijkl", severity: "moderate" }],
    }),
  );
  expect(result.status).toBe(0);
  expect(result.output).toContain("MODERATE other:");
});

test("the advisory match cannot cover a different package, range or severity", () => {
  for (const report of [
    { other: [finding] },
    { braces: [{ ...finding, vulnerable_versions: "<=3.0.4" }] },
    { braces: [{ ...finding, severity: "critical" }] },
  ]) {
    expect(run(fixture(report)).status).toBe(1);
  }
});

test("audit rejects absent registration, uncovered lock versions and missing installed packages", () => {
  const unregistered = fixture();
  writeFileSync(join(unregistered, "package.json"), "{}");
  expectBlocked(unregistered, "patch must be registered");
  const unlocked = fixture();
  const lock = JSON.parse(readFileSync(join(unlocked, "bun.lock"), "utf8"));
  lock.packages.other = ["braces@2.3.2"];
  writeFileSync(join(unlocked, "bun.lock"), JSON.stringify(lock));
  expectBlocked(unlocked, "only covers locked braces@3.0.3");
  const missing = fixture();
  rmSync(join(missing, "node_modules/braces"), { recursive: true });
  expectBlocked(missing, "No installed braces package");
});

test("audit rejects expired evidence and changed patch bytes", () => {
  const expired = fixture();
  const evidencePath = join(expired, "scripts/braces-mitigation.json");
  const evidence = JSON.parse(readFileSync(evidencePath, "utf8"));
  evidence.expires = "2020-01-01T00:00:00Z";
  writeFileSync(evidencePath, JSON.stringify(evidence));
  expectBlocked(expired, "expired");
  const changed = fixture();
  writeFileSync(join(changed, "patches/braces@3.0.3.patch"), "unreviewed patch");
  expectBlocked(changed, "checksum does not match");
});

test("every installed copy must match the reviewed code", () => {
  const root = fixture();
  const second = join(root, "node_modules/.bun/braces@3.0.3/node_modules/braces");
  cpSync(join(root, "node_modules/braces"), second, { recursive: true });
  const alias = join(root, "node_modules/aliased-braces");
  cpSync(join(root, "node_modules/braces"), alias, { recursive: true });
  expect(run(root).status).toBe(0);
  writeFileSync(join(alias, "lib/compile.js"), "module.exports = () => 'unpatched alias';");
  expectBlocked(root, "Unverified braces file:");
  cpSync(join(root, "node_modules/braces/lib/compile.js"), join(alias, "lib/compile.js"));
  writeFileSync(join(second, "lib/compile.js"), "module.exports = () => 'unpatched';");
  const result = run(root);
  expect(result.status).toBe(1);
  expect(result.output).toContain("Unverified braces file:");
});

test("audit fails closed on malformed, unknown or empty failed reports", () => {
  for (const report of [
    null,
    [],
    { braces: [{ ...finding, severity: "unknown" }] },
    { braces: "not an array" },
    {},
  ]) {
    expect(run(fixture(report)).status).toBe(1);
  }
  const root = fixture();
  writeFileSync(join(root, "audit.json"), "network failure");
  expect(run(root).status).toBe(1);
  const transportFailure = fixture();
  writeFileSync(join(transportFailure, "audit.status"), "2");
  expect(run(transportFailure).status).toBe(1);
  const clean = fixture({});
  writeFileSync(join(clean, "audit.status"), "0");
  expect(run(clean).status).toBe(0);
});
