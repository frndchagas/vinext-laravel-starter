import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { DiagnosticSeverity, Parser, fromFile } from "@asyncapi/parser";

const workspace = fileURLToPath(new URL(".", import.meta.url));
const contractPath = fileURLToPath(new URL("./asyncapi.yaml", import.meta.url));
const outputPath = fileURLToPath(new URL("./generated", import.meta.url));
const ANNOTATION_KEYWORDS = new Set([
  "default",
  "deprecated",
  "description",
  "example",
  "examples",
  "readOnly",
  "title",
  "writeOnly",
]);
const TYPESCRIPT_RESERVED_WORDS = new Set([
  "any",
  "boolean",
  "class",
  "const",
  "enum",
  "export",
  "extends",
  "function",
  "import",
  "interface",
  "never",
  "null",
  "number",
  "object",
  "string",
  "type",
  "unknown",
  "void",
]);
const NUMBER_FORMATS = new Set(["double", "float", "int32", "int64"]);
const STRING_FORMATS = new Set(["date-time", "email", "uri", "uuid"]);

function removeParserMetadata(value) {
  if (Array.isArray(value)) return value.map(removeParserMetadata);

  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !key.startsWith("x-parser-"))
        .map(([key, item]) => [key, removeParserMetadata(item)]),
    );
  }

  return value;
}

function assertTypeName(name) {
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name) || TYPESCRIPT_RESERVED_WORDS.has(name)) {
    throw new Error(`AsyncAPI schema and message names must be TypeScript identifiers: ${name}`);
  }
}

function rejectUnsupportedKeywords(schema, supported) {
  const unsupported = Object.keys(schema ?? {}).filter(
    (keyword) =>
      !supported.has(keyword) &&
      !ANNOTATION_KEYWORDS.has(keyword) &&
      !keyword.startsWith("x-parser-"),
  );

  if (unsupported.length > 0) {
    throw new Error(`Unsupported AsyncAPI schema keywords: ${unsupported.join(", ")}`);
  }
}

function schemaExpression(schema, componentNames, dependencies, currentName) {
  const schemaId = schema?.["x-parser-schema-id"];

  if (componentNames.has(schemaId) && schemaId !== currentName) {
    dependencies.add(schemaId);
    return schemaId;
  }

  if (Object.hasOwn(schema ?? {}, "const")) {
    rejectUnsupportedKeywords(schema, new Set(["const", "type"]));
    return JSON.stringify(schema.const);
  }

  if (Array.isArray(schema?.enum)) {
    rejectUnsupportedKeywords(schema, new Set(["enum", "format", "type"]));
    return schema.enum.map((value) => JSON.stringify(value)).join(" | ");
  }

  const alternatives = schema?.oneOf ?? schema?.anyOf;
  if (Array.isArray(alternatives)) {
    throw new Error("Unsupported AsyncAPI schema keywords: oneOf/anyOf");
  }

  if (schema?.type === "string") {
    rejectUnsupportedKeywords(schema, new Set(["format", "maxLength", "minLength", "pattern", "type"]));
    if (schema.format !== undefined && !STRING_FORMATS.has(schema.format)) {
      throw new Error(`Unsupported AsyncAPI string format: ${schema.format}`);
    }
    return "string";
  }
  if (schema?.type === "integer" || schema?.type === "number") {
    rejectUnsupportedKeywords(schema, new Set(["format", "maximum", "minimum", "type"]));
    if (schema.format !== undefined && !NUMBER_FORMATS.has(schema.format)) {
      throw new Error(`Unsupported AsyncAPI number format: ${schema.format}`);
    }
    return "number";
  }
  if (schema?.type === "boolean") {
    rejectUnsupportedKeywords(schema, new Set(["type"]));
    return "boolean";
  }
  if (schema?.type === "null") {
    rejectUnsupportedKeywords(schema, new Set(["type"]));
    return "null";
  }
  if (schema?.type === "array") {
    rejectUnsupportedKeywords(schema, new Set(["items", "maxItems", "minItems", "type"]));
    return `Array<${schemaExpression(schema.items, componentNames, dependencies, currentName)}>`;
  }
  if (schema?.type === "object") {
    rejectUnsupportedKeywords(
      schema,
      new Set(["additionalProperties", "maxProperties", "minProperties", "properties", "required", "type"]),
    );
    const required = new Set(schema.required ?? []);
    const properties = Object.entries(schema.properties ?? {}).map(([name, property]) => {
      const optional = required.has(name) ? "" : "?";
      return `${JSON.stringify(name)}${optional}: ${schemaExpression(property, componentNames, dependencies, currentName)};`;
    });

    if (schema.additionalProperties === false) return `{ ${properties.join(" ")} }`;
    if (schema.additionalProperties === true || schema.additionalProperties === undefined) {
      properties.push("[key: string]: unknown;");
      return `{ ${properties.join(" ")} }`;
    }
    if (typeof schema.additionalProperties === "object") {
      properties.push(
        `[key: string]: ${schemaExpression(schema.additionalProperties, componentNames, dependencies, currentName)};`,
      );
      return `{ ${properties.join(" ")} }`;
    }
  }

  throw new Error(`Unsupported AsyncAPI schema: ${JSON.stringify(removeParserMetadata(schema))}`);
}

function renderSchema(name, schema, componentNames) {
  assertTypeName(name);
  const dependencies = new Set();
  let declaration;

  if (schema.type === "object" && schema.additionalProperties === false) {
    rejectUnsupportedKeywords(
      schema,
      new Set(["additionalProperties", "maxProperties", "minProperties", "properties", "required", "type"]),
    );
    const required = new Set(schema.required ?? []);
    const properties = Object.entries(schema.properties ?? {}).map(([propertyName, property]) => {
      const comment = property.description ? `  /** ${property.description} */\n` : "";
      const optional = required.has(propertyName) ? "" : "?";
      const type = schemaExpression(property, componentNames, dependencies, name);
      return `${comment}  ${JSON.stringify(propertyName)}${optional}: ${type};`;
    });
    declaration = `export interface ${name} {\n${properties.join("\n")}\n}\n`;
  } else {
    declaration = `export type ${name} = ${schemaExpression(schema, componentNames, dependencies, name)};\n`;
  }

  const imports = [...dependencies]
    .sort()
    .map((dependency) => `import type { ${dependency} } from "./${dependency}";`)
    .join("\n");

  return imports === "" ? declaration : `${imports}\n\n${declaration}`;
}

function operationMessages(operation) {
  if (Array.isArray(operation.messages)) {
    return operation.messages.map((message) => [
      message["x-parser-unique-object-id"] ?? message.name,
      message,
    ]);
  }
  if (operation.messages && typeof operation.messages === "object") {
    return Object.entries(operation.messages);
  }

  return Object.entries(operation.channel?.messages ?? {});
}

export function generateArtifacts(parsed) {
  const schemas = new Map(Object.entries(parsed.components?.schemas ?? {}));
  const contracts = [];
  const contractKeys = new Set();
  const eventNames = new Set();
  const usedMessages = new Set();
  const channelMessages = new Set();
  const channels = Object.entries(parsed.channels ?? {})
    .map(([channelId, channel]) => {
      if (typeof channel.address !== "string") {
        throw new Error(`AsyncAPI channel ${channelId} must declare an address.`);
      }

      const messages = Object.entries(channel.messages ?? {}).map(([messageId, message]) => {
        if (typeof message?.name !== "string" || message.name === "") {
          throw new Error(`AsyncAPI message ${messageId} must declare a name.`);
        }
        channelMessages.add(messageId);
        return { event: message.name, message: messageId };
      });

      return { address: channel.address, channel: channelId, messages };
    })
    .sort((left, right) => left.channel.localeCompare(right.channel));

  for (const [operationId, operation] of Object.entries(parsed.operations ?? {})) {
    const channel = operation.channel;
    if (typeof channel?.address !== "string") {
      throw new Error(`AsyncAPI operation ${operationId} must reference a channel address.`);
    }

    const messages = operationMessages(operation);
    if (messages.length === 0) {
      throw new Error(`AsyncAPI operation ${operationId} must reference at least one message.`);
    }

    for (const [messageId, message] of messages) {
      if (typeof message?.name !== "string" || message.name === "") {
        throw new Error(`AsyncAPI message ${messageId} must declare a name.`);
      }
      assertTypeName(message.name);
      const normalizedEventName = message.name.toLowerCase();
      if (eventNames.has(normalizedEventName)) {
        throw new Error(`Duplicate AsyncAPI event name: ${message.name}`);
      }
      eventNames.add(normalizedEventName);
      usedMessages.add(messageId);

      if (message.payload === undefined) {
        throw new Error(`AsyncAPI message ${messageId} must declare a payload.`);
      }

      const payloadName = message.payload?.["x-parser-schema-id"];
      const generatedPayloadName = `${message.name}Payload`;
      const resolvedPayloadName = schemas.has(payloadName) ? payloadName : generatedPayloadName;
      if (!schemas.has(payloadName) && schemas.has(generatedPayloadName)) {
        throw new Error(`AsyncAPI payload type collision: ${generatedPayloadName}`);
      }
      if (!schemas.has(resolvedPayloadName)) schemas.set(resolvedPayloadName, message.payload);

      const contractKey = `${operationId}:${message.name}`;
      if (contractKeys.has(contractKey)) {
        throw new Error(`Duplicate AsyncAPI operation message: ${contractKey}`);
      }
      contractKeys.add(contractKey);
      contracts.push({
        action: operation.action,
        channel: channel.address,
        event: message.name,
        message: messageId,
        operation: operationId,
        payload: removeParserMetadata(message.payload),
        payload_type: resolvedPayloadName,
      });
    }
  }

  contracts.sort(
    (left, right) =>
      left.operation.localeCompare(right.operation) || left.event.localeCompare(right.event),
  );

  const orphanedMessages = [...channelMessages].filter((messageId) => !usedMessages.has(messageId));
  if (orphanedMessages.length > 0) {
    throw new Error(
      `AsyncAPI channel messages require an operation: ${orphanedMessages.sort().join(", ")}`,
    );
  }

  const componentNames = new Set(schemas.keys());
  const normalizedSchemaNames = new Set();
  for (const name of componentNames) {
    assertTypeName(name);
    const normalized = name.toLowerCase();
    if (normalizedSchemaNames.has(normalized)) {
      throw new Error(`Case-insensitive AsyncAPI schema name collision: ${name}`);
    }
    normalizedSchemaNames.add(normalized);
  }
  const artifacts = new Map();
  for (const [name, schema] of [...schemas].sort(([left], [right]) => left.localeCompare(right))) {
    artifacts.set(`${name}.ts`, renderSchema(name, schema, componentNames));
  }
  artifacts.set(
    "index.ts",
    [...schemas.keys()]
      .sort()
      .map((name) => `export type { ${name} } from "./${name}";`)
      .join("\n") + "\n",
  );
  artifacts.set(
    "realtime-contracts.json",
    `${JSON.stringify({ channels, messages: contracts }, null, 2)}\n`,
  );

  return artifacts;
}

if (import.meta.main) {
  if (!outputPath.endsWith("/contracts/realtime/generated")) {
    throw new Error(`Refusing to clean unexpected generated path: ${outputPath}`);
  }

  const parser = new Parser();
  const { document, diagnostics } = await fromFile(parser, contractPath).parse();
  const errors = diagnostics.filter(({ severity }) => severity === DiagnosticSeverity.Error);

  if (document === undefined || errors.length > 0) {
    throw new Error("AsyncAPI must be valid before conformance metadata can be generated.");
  }

  const artifacts = generateArtifacts(document.json());
  rmSync(outputPath, { recursive: true, force: true });
  mkdirSync(outputPath, { recursive: true });

  for (const [path, contents] of artifacts) {
    writeFileSync(new URL(`./generated/${path}`, import.meta.url), contents);
  }

  const formatter = Bun.spawnSync(["bunx", "oxfmt", "--write", "generated"], {
    cwd: workspace,
    stdout: "inherit",
    stderr: "inherit",
  });

  if (formatter.exitCode !== 0) {
    throw new Error(`oxfmt exited with ${formatter.exitCode}.`);
  }

  console.log(`Generated realtime artifacts: ${outputPath}`);
}
