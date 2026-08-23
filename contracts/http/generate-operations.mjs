import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { parse } from "yaml";

const HTTP_METHODS = new Set([
  "delete",
  "get",
  "head",
  "options",
  "patch",
  "post",
  "put",
  "trace",
]);
const contractPath = fileURLToPath(new URL("./openapi/openapi.yaml", import.meta.url));
const outputPath = fileURLToPath(new URL("./generated", import.meta.url));

export function operationsFromOpenApi(document) {
  const operations = [];
  const operationIds = new Set();

  for (const [path, pathItem] of Object.entries(document.paths ?? {})) {
    for (const [method, operation] of Object.entries(pathItem)) {
      if (!HTTP_METHODS.has(method)) continue;
      if (typeof operation.operationId !== "string" || operation.operationId === "") {
        throw new Error(`${method.toUpperCase()} ${path} must declare an operationId.`);
      }
      if (operationIds.has(operation.operationId)) {
        throw new Error(`Duplicate operationId: ${operation.operationId}`);
      }

      operationIds.add(operation.operationId);
      operations.push({
        method: method.toUpperCase(),
        operation_id: operation.operationId,
        path,
      });
    }
  }

  return operations.sort(
    (left, right) =>
      left.path.localeCompare(right.path) || left.method.localeCompare(right.method),
  );
}

export function enumsFromOpenApi(document) {
  return Object.fromEntries(
    Object.entries(document.components?.schemas ?? {})
      .filter(([, schema]) => Array.isArray(schema.enum))
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([name, schema]) => [name, schema.enum]),
  );
}

if (import.meta.main) {
  if (!outputPath.endsWith("/contracts/http/generated")) {
    throw new Error(`Refusing to clean unexpected generated path: ${outputPath}`);
  }

  const document = parse(readFileSync(contractPath, "utf8"));
  const operations = operationsFromOpenApi(document);
  const enums = enumsFromOpenApi(document);

  rmSync(outputPath, { recursive: true, force: true });
  mkdirSync(outputPath, { recursive: true });
  writeFileSync(
    new URL("./generated/operations.json", import.meta.url),
    `${JSON.stringify({ enums, operations }, null, 2)}\n`,
  );

  console.log(`Generated HTTP operation manifest: ${outputPath}`);
}
