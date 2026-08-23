import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { parse } from "yaml";

import { enumsFromOpenApi, operationsFromOpenApi } from "./generate-operations.mjs";

describe("operationsFromOpenApi", () => {
  test("collects every HTTP operation in a stable order", () => {
    expect(
      operationsFromOpenApi({
        paths: {
          "/widgets/{id}": {
            parameters: [],
            patch: { operationId: "updateWidget" },
            get: { operationId: "getWidget" },
          },
          "/widgets": {
            post: { operationId: "createWidget" },
          },
        },
      }),
    ).toEqual([
      { method: "POST", operation_id: "createWidget", path: "/widgets" },
      { method: "GET", operation_id: "getWidget", path: "/widgets/{id}" },
      { method: "PATCH", operation_id: "updateWidget", path: "/widgets/{id}" },
    ]);
  });

  test("rejects missing and duplicate operation identifiers", () => {
    expect(() =>
      operationsFromOpenApi({ paths: { "/widgets": { get: {} } } }),
    ).toThrow(/must declare an operationId/);

    expect(() =>
      operationsFromOpenApi({
        paths: {
          "/widgets": { get: { operationId: "widgets" } },
          "/other": { get: { operationId: "widgets" } },
        },
      }),
    ).toThrow(/Duplicate operationId/);
  });

  test("collects named enums for server conformance", () => {
    expect(
      enumsFromOpenApi({
        components: {
          schemas: {
            State: { type: "string", enum: ["queued", "completed"] },
            Message: { type: "object", properties: {} },
          },
        },
      }),
    ).toEqual({ State: ["queued", "completed"] });
  });

  test("keeps every documented response object closed or explicitly indexed", () => {
    const document = parse(
      readFileSync(new URL("./openapi/openapi.yaml", import.meta.url), "utf8"),
    );
    const openObjects = [];

    function inspect(schema, location, references = new Set()) {
      if (typeof schema?.$ref === "string") {
        const name = schema.$ref.split("/").at(-1);
        if (references.has(name)) return;
        inspect(document.components.schemas[name], `${location} -> ${name}`, new Set([...references, name]));
        return;
      }

      for (const keyword of ["allOf", "anyOf", "oneOf"]) {
        for (const [index, alternative] of (schema?.[keyword] ?? []).entries()) {
          inspect(alternative, `${location}.${keyword}[${index}]`, references);
        }
      }
      if (schema?.type === "array") inspect(schema.items, `${location}.items`, references);
      if (schema?.type !== "object") return;

      const additional = schema.additionalProperties ?? schema.unevaluatedProperties;
      const closed =
        additional === false ||
        (additional?.not && Object.keys(additional.not).length === 0) ||
        (additional !== null && typeof additional === "object");
      if (!closed) openObjects.push(location);

      for (const [name, property] of Object.entries(schema.properties ?? {})) {
        inspect(property, `${location}.${name}`, references);
      }
      if (additional && typeof additional === "object" && !additional.not) {
        inspect(additional, `${location}.*`, references);
      }
    }

    for (const [path, pathItem] of Object.entries(document.paths)) {
      for (const [method, operation] of Object.entries(pathItem)) {
        if (!HTTP_METHODS_FOR_TEST.has(method)) continue;
        for (const [status, response] of Object.entries(operation.responses)) {
          for (const media of Object.values(response.content ?? {})) {
            inspect(media.schema, `${method.toUpperCase()} ${path} ${status}`);
          }
        }
      }
    }

    expect(openObjects).toEqual([]);
  });
});

const HTTP_METHODS_FOR_TEST = new Set([
  "delete",
  "get",
  "head",
  "options",
  "patch",
  "post",
  "put",
  "trace",
]);
