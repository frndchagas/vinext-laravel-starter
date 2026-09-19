import { expect, test } from "bun:test";
import { fileURLToPath } from "node:url";

const ignorePath = fileURLToPath(new URL("../.trivyignore.yaml", import.meta.url));

test("Trivy exceptions require a narrow scope, evidence and a short expiry", async () => {
  const document = Bun.YAML.parse(await Bun.file(ignorePath).text());
  expect(Array.isArray(document.vulnerabilities)).toBeTrue();

  for (const exception of document.vulnerabilities) {
    expect(exception.id).toMatch(/^(CVE-|GHSA-)/);
    expect(exception.paths.length).toBeGreaterThan(0);
    expect(exception.purls.length).toBeGreaterThan(0);
    expect([...exception.paths, ...exception.purls].every((value) => !value.includes("*"))).toBeTrue();
    expect(exception.statement).toMatch(/https:\/\//);
    const expiry = Date.parse(`${exception.expired_at}T00:00:00Z`);
    expect(expiry).toBeGreaterThan(Date.now());
    expect(expiry).toBeLessThanOrEqual(Date.now() + 90 * 24 * 60 * 60 * 1000);
  }
});
