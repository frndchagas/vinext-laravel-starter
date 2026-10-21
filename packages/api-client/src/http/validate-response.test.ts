import { describe, expect, it } from "vitest";

import { RegisterBody } from "../generated/zod";
import { validateContractResponse } from "./validate-response";

describe("validateContractResponse", () => {
  it("accepts a documented response through a parameterized route", () => {
    expect(() =>
      validateContractResponse("PATCH", "/api/v1/admin/users/user-id/role?ignored=true", 200, {
        id: "user-id",
        name: "User",
        email: "user@example.com",
        email_verified: true,
        roles: ["member"],
        created_at: "2026-08-21T12:00:00Z",
      }),
    ).not.toThrow();
  });

  it("reports the operation and field when a payload drifts", () => {
    expect(() =>
      validateContractResponse("GET", "/api/v1/me", 200, {
        id: "user-id",
        name: "User",
        email: "user@example.com",
        email_verified: "yes",
        two_factor_enabled: false,
        two_factor_confirmed: false,
        roles: [],
        permissions: [],
      }),
    ).toThrow(/getMe returned an invalid 200 response.*email_verified/);
  });

  it("rejects undocumented response fields", () => {
    expect(() =>
      validateContractResponse("GET", "/api/v1/me", 200, {
        id: "user-id",
        name: "User",
        email: "user@example.com",
        email_verified: true,
        two_factor_enabled: false,
        two_factor_confirmed: false,
        roles: [],
        permissions: [],
        unexpected_secret: "must not cross the boundary",
      }),
    ).toThrow(/getMe returned an invalid 200 response.*unexpected_secret/);

    expect(() =>
      validateContractResponse("GET", "/api/v1/admin/users", 200, {
        data: [{
          id: "user-id",
          name: "User",
          email: "user@example.com",
          email_verified: true,
          roles: ["member"],
          created_at: "2026-08-21T11:59:00Z",
          unexpected: true,
        }],
        meta: { next_cursor: null, prev_cursor: null },
      }),
    ).toThrow(/listAdminUsers returned an invalid 200 response.*data.0.unexpected/);

    expect(() =>
      validateContractResponse("GET", "/api/v1/me", 401, {
        type: "about:blank",
        title: "Unauthorized",
        status: 401,
        unexpected: true,
      }),
    ).toThrow(/getMe returned an invalid 401 response.*unexpected/);
  });

  it("keeps request bodies open to match Laravel input handling", () => {
    expect(() =>
      RegisterBody.parse({
        name: "User",
        email: "user@example.com",
        password: "secret-password",
        password_confirmation: "secret-password",
        product_specific_field: "allowed for consumers",
      }),
    ).not.toThrow();
  });

  it("rejects an undocumented status", () => {
    expect(() => validateContractResponse("GET", "/api/v1/me", 418, {})).toThrow(
      /getMe returned undocumented status 418/,
    );
  });

  it("validates every field in a validation error map", () => {
    expect(() =>
      validateContractResponse("POST", "/api/v1/auth/register", 422, {
        type: "about:blank",
        title: "Unprocessable Content",
        status: 422,
        errors: { email: "not-an-array" },
      }),
    ).toThrow(/register returned an invalid 422 response.*errors.email/);

    expect(() =>
      validateContractResponse("POST", "/api/v1/auth/register", 422, {
        type: "about:blank",
        title: "Unprocessable Content",
        status: 422,
        errors: { email: ["The email field is invalid."] },
      }),
    ).not.toThrow();
  });

  it("accepts a documented rate-limit response", () => {
    expect(() =>
      validateContractResponse("POST", "/api/v1/auth/login", 429, {
        type: "about:blank",
        title: "Too Many Requests",
        status: 429,
        detail: "Too Many Attempts.",
      }),
    ).not.toThrow();
  });
});
