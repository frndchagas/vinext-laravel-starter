# ADR 0001: type-first API contract

Status: accepted.
Implementation: complete.

TypeSpec is the source for application HTTP consumed by the frontend. The current contract reports version 1.0.0 and uses `/api/v1` routes. It emits OpenAPI 3.1, and Orval generates the Fetch client, TanStack Query hooks, Zod schemas and MSW handlers. Laravel keeps native request, resource and domain types.

Request objects remain open because Laravel and Fortify ignore product-specific fields they do not consume. Response objects are closed. In development and tests, the client validates each documented response with strict generated Zod schemas and reports the operation, status and invalid field. Production keeps the generated TypeScript types without parsing responses.

The HTTP build also emits a route-surface manifest. PHP tests compare its methods, normalized paths and named domain enums with Laravel. Oasdiff compares pull requests with their target branch. Feature and browser tests prove implementation behavior; Prism is not a current gate.

TypeScript RPC libraries were rejected because the server is PHP. Scramble was rejected as the source because it derives a contract after implementation rather than defining the boundary first.
