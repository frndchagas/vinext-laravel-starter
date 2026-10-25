import { readFileSync, writeFileSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";

import { parse } from "yaml";

function dictionaryKeyword(schema) {
  if (schema.type !== "object" || Object.keys(schema).length !== 2) return null;
  return ["unevaluatedProperties", "additionalProperties"].find((key) =>
    Object.hasOwn(schema, key),
  );
}

function normalizePair(base, revision) {
  if (
    !base ||
    !revision ||
    typeof base !== "object" ||
    typeof revision !== "object"
  )
    return;
  if (Array.isArray(base) || Array.isArray(revision)) return;

  const baseKeyword = dictionaryKeyword(base);
  const revisionKeyword = dictionaryKeyword(revision);
  // Only equal constraints on two plain dictionaries qualify. In particular, do not normalize
  // a removed constraint: oasdiff does not detect every removal of additionalProperties.
  if (
    baseKeyword &&
    revisionKeyword &&
    isDeepStrictEqual(base[baseKeyword], revision[revisionKeyword])
  ) {
    for (const [schema, keyword] of [
      [base, baseKeyword],
      [revision, revisionKeyword],
    ]) {
      if (keyword === "unevaluatedProperties") {
        schema.additionalProperties = schema.unevaluatedProperties;
        delete schema.unevaluatedProperties;
      }
    }
  }

  for (const keyword of [
    "properties",
    "patternProperties",
    "dependentSchemas",
    "$defs",
  ]) {
    for (const name of Object.keys(base[keyword] ?? {})) {
      normalizePair(base[keyword][name], revision[keyword]?.[name]);
    }
  }
  for (const keyword of ["allOf", "anyOf", "oneOf", "prefixItems"]) {
    for (const [index, child] of (base[keyword] ?? []).entries()) {
      normalizePair(child, revision[keyword]?.[index]);
    }
  }
  for (const keyword of [
    "items",
    "contains",
    "additionalProperties",
    "unevaluatedProperties",
    "propertyNames",
    "not",
    "if",
    "then",
    "else",
  ])
    normalizePair(base[keyword], revision[keyword]);
}

const [baseInput, revisionInput, baseOutput, revisionOutput] =
  process.argv.slice(2);
if (!baseInput || !revisionInput || !baseOutput || !revisionOutput) {
  throw new Error(
    "Usage: bun normalize-openapi-records.mjs <base> <revision> <base-output> <revision-output>",
  );
}
const base = parse(readFileSync(baseInput, "utf8"));
const revision = parse(readFileSync(revisionInput, "utf8"));
for (const name of Object.keys(base.components?.schemas ?? {})) {
  normalizePair(
    base.components.schemas[name],
    revision.components?.schemas?.[name],
  );
}
writeFileSync(baseOutput, `${JSON.stringify(base, null, 2)}\n`);
writeFileSync(revisionOutput, `${JSON.stringify(revision, null, 2)}\n`);
