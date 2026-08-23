import { expect, test } from "bun:test";
import { fileURLToPath } from "node:url";

const ignorePath = fileURLToPath(new URL("../.trivyignore.yaml", import.meta.url));
const expectedIds = [
  "CVE-2025-61726",
  "CVE-2025-61729",
  "CVE-2025-68121",
  "CVE-2026-25679",
  "CVE-2026-27145",
  "CVE-2026-32280",
  "CVE-2026-32281",
  "CVE-2026-32283",
  "CVE-2026-33811",
  "CVE-2026-33814",
  "CVE-2026-33818",
  "CVE-2026-39820",
  "CVE-2026-39821",
  "CVE-2026-39822",
  "CVE-2026-39836",
  "CVE-2026-42499",
  "CVE-2026-42504",
  "CVE-2026-56853",
  "CVE-2026-56858",
  "CVE-2026-56859",
  "CVE-2026-56860",
  "CVE-2026-56862",
];

test("the PostgreSQL Trivy exceptions stay narrow and expire", async () => {
  const document = Bun.YAML.parse(await Bun.file(ignorePath).text());
  const vulnerabilities = document.vulnerabilities;

  expect(Array.isArray(vulnerabilities)).toBeTrue();
  expect(vulnerabilities.map(({ id }) => id).sort()).toEqual(expectedIds);

  for (const vulnerability of vulnerabilities) {
    expect(vulnerability.paths).toEqual(["usr/local/bin/gosu"]);
    expect(vulnerability.purls).toEqual(["pkg:golang/stdlib@v1.24.6"]);
    expect(vulnerability.expired_at).toBe("2026-09-30");
    expect(vulnerability.statement).toContain("32607173744");
    expect(Date.parse(`${vulnerability.expired_at}T00:00:00Z`)).toBeGreaterThan(Date.now());
  }
});
