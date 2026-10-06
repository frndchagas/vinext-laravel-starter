import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { installedBraces } from "./installed-braces.mjs";

const root = process.cwd();
const scripts = dirname(fileURLToPath(import.meta.url));
const advisory = "https://github.com/advisories/GHSA-vfj7-8cjw-p6xm";
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const digest = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");

function verifyMitigation() {
  const mitigation = readJson(join(scripts, "braces-mitigation.json"));
  const expiry = Date.parse(mitigation.expires);
  if (
    mitigation.advisory !== advisory ||
    mitigation.package !== "braces" ||
    mitigation.version !== "3.0.3"
  ) {
    throw new Error("Unrecognized braces mitigation.");
  }
  if (
    !Number.isFinite(expiry) ||
    expiry <= Date.now() ||
    expiry > Date.now() + 90 * 24 * 60 * 60 * 1000
  ) {
    throw new Error("The braces mitigation has expired or has an invalid expiry.");
  }
  const packageJson = readJson(join(root, "package.json"));
  const lock = Bun.JSON5.parse(readFileSync(join(root, "bun.lock"), "utf8"));
  for (const document of [packageJson, lock]) {
    if (document.patchedDependencies?.["braces@3.0.3"] !== mitigation.patch) {
      throw new Error("The braces patch must be registered in package.json and bun.lock.");
    }
  }
  const locked = Object.values(lock.packages ?? {}).filter(
    (value) =>
      Array.isArray(value) && typeof value[0] === "string" && value[0].startsWith("braces@"),
  );
  if (locked.length === 0 || locked.some((value) => value[0] !== "braces@3.0.3")) {
    throw new Error("The braces mitigation only covers locked braces@3.0.3.");
  }
  if (digest(join(root, mitigation.patch)) !== mitigation.patchSha256) {
    throw new Error("The braces patch checksum does not match the reviewed mitigation.");
  }
  const packages = installedBraces(root);
  if (packages.length === 0) throw new Error("No installed braces package was found.");
  for (const packageRoot of packages) {
    const installed = readJson(join(packageRoot, "package.json"));
    if (installed.name !== "braces" || installed.version !== "3.0.3")
      throw new Error(`Uncovered braces version at ${packageRoot}.`);
    for (const [file, checksum] of Object.entries(mitigation.files)) {
      if (digest(join(packageRoot, file)) !== checksum)
        throw new Error(`Unverified braces file: ${join(packageRoot, file)}`);
    }
    const proof = spawnSync("node", [join(scripts, "braces-security-check.mjs"), packageRoot], {
      encoding: "utf8",
      timeout: 10_000,
    });
    if (proof.error || proof.status !== 0)
      throw new Error(`Braces regression proof failed: ${proof.error ?? proof.stderr}`);
  }
  return mitigation;
}

try {
  const mitigation = verifyMitigation();
  const result = spawnSync("bun", ["audit", "--json"], {
    cwd: root,
    encoding: "utf8",
    timeout: 60_000,
  });
  if (result.error || ![0, 1].includes(result.status))
    throw new Error(`Dependency audit failed: ${result.error ?? result.stderr}`);
  const report = JSON.parse(result.stdout);
  if (report === null || typeof report !== "object" || Array.isArray(report))
    throw new Error("Unrecognized audit report.");
  let blocked = false;
  let count = 0;
  for (const [name, findings] of Object.entries(report)) {
    if (!Array.isArray(findings)) throw new Error("Unrecognized audit findings.");
    for (const finding of findings) {
      if (
        !finding ||
        typeof finding.url !== "string" ||
        !["low", "moderate", "high", "critical"].includes(finding.severity)
      )
        throw new Error("Unrecognized audit finding.");
      count++;
      if (
        name === "braces" &&
        finding.url === advisory &&
        finding.severity === "high" &&
        finding.vulnerable_versions === "<=3.0.3"
      ) {
        console.log(
          `MITIGATED ${name}: ${finding.url}; reviewed patch and installed Node regression proof verified; expires ${mitigation.expires}.`,
        );
      } else {
        console.log(`${finding.severity.toUpperCase()} ${name}: ${finding.url}`);
        if (["high", "critical"].includes(finding.severity)) blocked = true;
      }
    }
  }
  if (result.status === 1 && count === 0)
    throw new Error("Audit failed without reporting a vulnerability.");
  if (blocked) process.exitCode = 1;
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
