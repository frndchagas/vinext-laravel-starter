import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { parse } from "yaml";

const openApiPath = fileURLToPath(
  new URL("../../../contracts/http/openapi/openapi.yaml", import.meta.url),
);
const outputPath = fileURLToPath(
  new URL("../src/generated/response-contracts.ts", import.meta.url),
);
const document = parse(readFileSync(openApiPath, "utf8"));
const imports = new Set();
const definitions = new Map();
const entries = [];
const annotationKeywords = new Set([
  "default",
  "deprecated",
  "description",
  "example",
  "examples",
  "readOnly",
  "title",
  "writeOnly",
]);

function pascal(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function routePattern(path) {
  const escaped = path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replaceAll("/", "\\/");
  return `^${escaped.replace(/\\\{[^}]+\\\}/g, "[^/]+")}$`;
}

function dereference(schema) {
  if (typeof schema?.$ref !== "string") return schema;

  const name = schema.$ref.split("/").at(-1);
  return document.components.schemas[name];
}

function rejectUnsupportedKeywords(schema, supported) {
  const unsupported = Object.keys(schema).filter(
    (keyword) =>
      !supported.has(keyword) &&
      !annotationKeywords.has(keyword) &&
      !keyword.startsWith("x-"),
  );

  if (unsupported.length > 0) {
    throw new Error(`Unsupported response schema keywords: ${unsupported.join(", ")}`);
  }
}

function isNeverSchema(schema) {
  return (
    schema !== null &&
    typeof schema === "object" &&
    Object.keys(schema).length === 1 &&
    schema.not !== null &&
    typeof schema.not === "object" &&
    Object.keys(schema.not).length === 0
  );
}

function zodExpression(input) {
  const schema = dereference(input);

  if (Object.hasOwn(schema, "const")) {
    rejectUnsupportedKeywords(schema, new Set(["const", "type"]));
    return `zod.literal(${JSON.stringify(schema.const)})`;
  }

  if (Array.isArray(schema.enum)) {
    rejectUnsupportedKeywords(schema, new Set(["enum", "type"]));
    return `zod.enum(${JSON.stringify(schema.enum)})`;
  }

  if (Array.isArray(schema.anyOf)) {
    rejectUnsupportedKeywords(schema, new Set(["anyOf"]));
    return `zod.union([${schema.anyOf.map(zodExpression).join(", ")}])`;
  }

  if (schema.type === "string") {
    rejectUnsupportedKeywords(
      schema,
      new Set(["format", "maxLength", "minLength", "pattern", "type"]),
    );

    let expression = "zod.string()";

    if (schema.format === "date-time") expression = 'zod.iso.datetime({ offset: true })';
    else if (schema.format === "email") expression = "zod.email()";
    else if (schema.format === "uri") expression = "zod.url()";
    else if (schema.format === "uuid") expression = "zod.uuid()";
    else if (schema.format !== undefined) {
      throw new Error(`Unsupported response string format: ${schema.format}`);
    }

    if (schema.minLength !== undefined) expression += `.min(${schema.minLength})`;
    if (schema.maxLength !== undefined) expression += `.max(${schema.maxLength})`;
    if (schema.pattern !== undefined) {
      expression += `.regex(new RegExp(${JSON.stringify(schema.pattern)}))`;
    }

    return expression;
  }

  if (schema.type === "integer" || schema.type === "number") {
    rejectUnsupportedKeywords(schema, new Set(["format", "maximum", "minimum", "type"]));
    let expression = schema.type === "integer" ? "zod.number().int()" : "zod.number()";

    if (schema.format === "int32") {
      expression += ".min(-2147483648).max(2147483647)";
    } else if (schema.format !== undefined && schema.format !== "int64") {
      throw new Error(`Unsupported response number format: ${schema.format}`);
    }

    if (schema.minimum !== undefined) expression += `.min(${schema.minimum})`;
    if (schema.maximum !== undefined) expression += `.max(${schema.maximum})`;

    return expression;
  }

  if (schema.type === "boolean") {
    rejectUnsupportedKeywords(schema, new Set(["type"]));
    return "zod.boolean()";
  }

  if (schema.type === "null") {
    rejectUnsupportedKeywords(schema, new Set(["type"]));
    return "zod.null()";
  }

  if (schema.type === "array") {
    rejectUnsupportedKeywords(schema, new Set(["items", "maxItems", "minItems", "type"]));
    let expression = `zod.array(${zodExpression(schema.items)})`;
    if (schema.minItems !== undefined) expression += `.min(${schema.minItems})`;
    if (schema.maxItems !== undefined) expression += `.max(${schema.maxItems})`;
    return expression;
  }

  if (schema.type === "object") {
    rejectUnsupportedKeywords(
      schema,
      new Set([
        "additionalProperties",
        "maxProperties",
        "minProperties",
        "properties",
        "required",
        "type",
        "unevaluatedProperties",
      ]),
    );
    const required = new Set(schema.required ?? []);
    const properties = Object.entries(schema.properties ?? {}).map(([name, property]) => {
      const expression = zodExpression(property);
      return `  ${JSON.stringify(name)}: ${required.has(name) ? expression : `${expression}.optional()`},`;
    });
    let object = `zod.object({\n${properties.join("\n")}\n})`;
    const additionalProperties = schema.additionalProperties ?? schema.unevaluatedProperties;

    if (additionalProperties === false || isNeverSchema(additionalProperties)) {
      object += ".strict()";
    }
    else if (additionalProperties === true) object += ".passthrough()";
    else if (additionalProperties && typeof additionalProperties === "object") {
      object += `.catchall(${zodExpression(additionalProperties)})`;
    }

    if (schema.minProperties !== undefined) object += `.refine((value) => Object.keys(value).length >= ${schema.minProperties})`;
    if (schema.maxProperties !== undefined) object += `.refine((value) => Object.keys(value).length <= ${schema.maxProperties})`;

    return object;
  }

  throw new Error(`Unsupported response schema: ${JSON.stringify(schema)}`);
}

function schemaName(operationId, status, response) {
  const schema = Object.values(response.content ?? {})[0]?.schema;

  if (schema === undefined) return "EmptyResponse";

  if (Number(status) >= 200 && Number(status) < 300) {
    const name = `${pascal(operationId)}Response`;
    imports.add(name);
    return name;
  }

  const name = `${pascal(operationId)}Response${status}`;
  definitions.set(name, zodExpression(schema));
  return name;
}

for (const [path, pathItem] of Object.entries(document.paths)) {
  for (const [method, operation] of Object.entries(pathItem)) {
    if (typeof operation.operationId !== "string") continue;

    const statuses = Object.entries(operation.responses).map(
      ([status, response]) => `      ${status}: ${schemaName(operation.operationId, status, response)},`,
    );

    entries.push(`  {
    operationId: "${operation.operationId}",
    method: "${method.toUpperCase()}",
    path: /${routePattern(path)}/,
    responses: {
${statuses.join("\n")}
    },
  },`);
  }
}

const source = `/**
 * Generated from contracts/http/openapi/openapi.yaml.
 * Do not edit manually.
 */
import * as zod from "zod";

import {
${[...imports]
  .sort()
  .map((name) => `  ${name},`)
  .join("\n")}
} from "./zod";

const EmptyResponse = zod.undefined();
${[...definitions]
  .map(([name, expression]) => `const ${name} = ${expression};`)
  .join("\n")}

export const responseContracts = [
${entries.join("\n")}
] as const;
`;

writeFileSync(outputPath, source);
console.log(`Generated HTTP response contracts: ${outputPath}`);
