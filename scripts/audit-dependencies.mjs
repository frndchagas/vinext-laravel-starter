import { spawnSync } from "node:child_process";

try {
  const result = spawnSync("bun", ["audit", "--json"], {
    cwd: process.cwd(),
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
      console.log(`${finding.severity.toUpperCase()} ${name}: ${finding.url}`);
      if (["high", "critical"].includes(finding.severity)) blocked = true;
    }
  }
  if (result.status === 1 && count === 0)
    throw new Error("Audit failed without reporting a vulnerability.");
  if (blocked) process.exitCode = 1;
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
