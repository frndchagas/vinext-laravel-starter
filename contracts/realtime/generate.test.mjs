import { describe, expect, test } from "bun:test";

import { generateArtifacts } from "./generate.mjs";

function message(name, payloadName) {
  return {
    name,
    payload: {
      type: "object",
      additionalProperties: false,
      required: ["id"],
      properties: { id: { type: "string", "x-parser-schema-id": `<${name}-id>` } },
      "x-parser-schema-id": payloadName,
    },
    "x-parser-unique-object-id": name,
  };
}

describe("generateArtifacts", () => {
  test("generates every operation message and payload", () => {
    const first = message("FirstChanged", "FirstChangedPayload");
    const second = message("SecondChanged", "SecondChangedPayload");
    first.payload.properties.states = {
      type: "array",
      items: { type: "string", enum: ["ready", "done"], "x-parser-schema-id": "State" },
    };
    const firstChannel = { address: "private-first.{id}", messages: { first } };
    const secondChannel = { address: "private-second.{id}", messages: { second } };
    const artifacts = generateArtifacts({
      channels: { first: firstChannel, second: secondChannel },
      components: {
        schemas: {
          FirstChangedPayload: first.payload,
          SecondChangedPayload: second.payload,
          State: { type: "string", enum: ["ready", "done"], "x-parser-schema-id": "State" },
        },
      },
      operations: {
        receiveFirst: {
          action: "receive",
          channel: firstChannel,
        },
        receiveSecond: {
          action: "receive",
          channel: secondChannel,
        },
      },
    });

    expect([...artifacts.keys()].sort()).toEqual([
      "FirstChangedPayload.ts",
      "SecondChangedPayload.ts",
      "State.ts",
      "index.ts",
      "realtime-contracts.json",
    ]);
    expect(artifacts.get("FirstChangedPayload.ts")).toContain('import type { State }');
    expect(artifacts.get("FirstChangedPayload.ts")).toContain('"states"?: Array<State>');
    const manifest = JSON.parse(artifacts.get("realtime-contracts.json"));
    expect(manifest.channels).toHaveLength(2);
    expect(manifest.messages).toHaveLength(2);
  });

  test("fails on an unsupported schema instead of omitting it", () => {
    const changed = message("UnsupportedChanged", "UnsupportedChangedPayload");
    changed.payload.properties.id = { type: "funky" };

    expect(() =>
      generateArtifacts({
        components: { schemas: { UnsupportedChangedPayload: changed.payload } },
        operations: {
          receiveUnsupported: {
            action: "receive",
            channel: { address: "private-unsupported", messages: { changed } },
          },
        },
      }),
    ).toThrow(/Unsupported AsyncAPI schema/);

    changed.payload.properties.id = { type: "string", patternProperties: {} };
    expect(() =>
      generateArtifacts({
        components: { schemas: { UnsupportedChangedPayload: changed.payload } },
        operations: {
          receiveUnsupported: {
            action: "receive",
            channel: { address: "private-unsupported", messages: { changed } },
          },
        },
      }),
    ).toThrow(/Unsupported AsyncAPI schema keywords/);

    changed.payload.properties.id = { type: "string", format: "funky" };
    expect(() =>
      generateArtifacts({
        components: { schemas: { UnsupportedChangedPayload: changed.payload } },
        operations: {
          receiveUnsupported: {
            action: "receive",
            channel: { address: "private-unsupported", messages: { changed } },
          },
        },
      }),
    ).toThrow(/Unsupported AsyncAPI string format/);
  });

  test("rejects duplicate event names and messages without operations", () => {
    const first = message("SameChanged", "FirstPayload");
    const second = message("SameChanged", "SecondPayload");

    expect(() =>
      generateArtifacts({
        components: { schemas: { FirstPayload: first.payload, SecondPayload: second.payload } },
        operations: {
          receiveFirst: {
            action: "receive",
            channel: { address: "private-first", messages: { first } },
          },
          receiveSecond: {
            action: "receive",
            channel: { address: "private-second", messages: { second } },
          },
        },
      }),
    ).toThrow(/Duplicate AsyncAPI event name/);

    expect(() =>
      generateArtifacts({
        channels: { orphaned: { address: "private-orphaned", messages: { first } } },
        components: { schemas: { FirstPayload: first.payload } },
        operations: {},
      }),
    ).toThrow(/channel messages require an operation/);
  });
});
