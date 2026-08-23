import { defineConfig } from "orval";

export default defineConfig({
  api: {
    input: "../../contracts/http/openapi/openapi.yaml",
    output: {
      target: "./src/generated/endpoints.ts",
      schemas: "./src/generated/models",
      client: "react-query",
      httpClient: "fetch",
      mode: "split",
      clean: true,
      mock: true,
      headers: true,
      override: {
        mutator: {
          path: "./src/http/fetcher.ts",
          name: "apiFetch",
        },
      },
    },
  },
  apiZod: {
    input: "../../contracts/http/openapi/openapi.yaml",
    output: {
      target: "./src/generated/zod.ts",
      client: "zod",
      mode: "single",
      override: {
        zod: {
          strict: {
            response: true,
          },
        },
      },
    },
  },
});
