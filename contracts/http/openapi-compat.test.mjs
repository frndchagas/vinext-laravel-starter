import { expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const normalizer = fileURLToPath(
  new URL("./normalize-openapi-records.mjs", import.meta.url),
);
const strings = { type: "array", items: { type: "string" } };

function document(errors) {
  return {
    openapi: "3.1.0",
    info: { title: "Validation contract", version: "1.0.0" },
    paths: {
      "/widgets": {
        get: {
          operationId: "listWidgets",
          responses: {
            422: {
              description: "Validation failed",
              content: {
                "application/problem+json": {
                  schema: { $ref: "#/components/schemas/ValidationProblem" },
                },
              },
            },
          },
        },
      },
    },
    components: {
      schemas: {
        ValidationProblem: {
          type: "object",
          required: ["errors"],
          properties: { errors },
          unevaluatedProperties: { not: {} },
        },
      },
    },
  };
}

function compare(base, revision) {
  const directory = mkdtempSync(join(tmpdir(), "oasdiff-records-"));
  try {
    for (const [name, schema] of Object.entries({ base, revision })) {
      const input = join(directory, `${name}.json`);
      writeFileSync(input, JSON.stringify(document(schema)));
    }
    const normalized = spawnSync(
      process.execPath,
      [
        normalizer,
        join(directory, "base.json"),
        join(directory, "revision.json"),
        join(directory, "base-normalized.json"),
        join(directory, "revision-normalized.json"),
      ],
      { encoding: "utf8" },
    );
    expect(normalized.status, normalized.stderr).toBe(0);

    return spawnSync(
      "docker",
      [
        "run",
        "--rm",
        "-v",
        `${directory}:/spec:ro`,
        "tufin/oasdiff:v1.34.1",
        "breaking",
        "/spec/base-normalized.json",
        "/spec/revision-normalized.json",
        "--allow-external-refs=false",
        "--fail-on",
        "ERR",
        "--format",
        "json",
      ],
      { encoding: "utf8" },
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test("oasdiff accepts equivalent TypeSpec dictionary keywords", () => {
  const result = compare(
    { type: "object", unevaluatedProperties: strings },
    { type: "object", additionalProperties: strings },
  );
  expect(result.status, result.stdout + result.stderr).toBe(0);
}, 30_000);

test.each([
  ["removed dictionary constraint", { type: "object" }],
  [
    "changed dictionary value type",
    {
      type: "object",
      additionalProperties: { type: "array", items: { type: "number" } },
    },
  ],
])(
  "oasdiff still rejects %s",
  (_name, revision) => {
    const result = compare(
      { type: "object", unevaluatedProperties: strings },
      revision,
    );
    expect(result.status, result.stdout + result.stderr).toBe(1);
    expect(JSON.parse(result.stdout).some((change) => change.level === 3)).toBe(
      true,
    );
  },
  30_000,
);

test("oasdiff preserves diagnostics for composed dictionary schemas", () => {
  const composition = {
    allOf: [{ type: "object", properties: { count: { type: "integer" } } }],
  };
  const result = compare(
    { type: "object", ...composition, unevaluatedProperties: strings },
    { type: "object", ...composition, additionalProperties: strings },
  );
  expect(result.status, result.stdout + result.stderr).toBe(0);
  expect(
    JSON.parse(result.stdout).some(
      (change) =>
        change.id === "response-property-unevaluated-properties-removed" &&
        change.level === 2,
    ),
  ).toBe(true);
}, 30_000);
