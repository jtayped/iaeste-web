import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { components } from "@repo/api-client";

import {
  mapSubmitResult,
  mapVerifyResult,
  readRegistrationId,
  readToken,
} from "./registration-flow";

type ApiError = components["schemas"]["ApiError"];

function apiError(
  code: ApiError["error"]["code"],
  details?: ApiError["error"]["details"],
): ApiError {
  return {
    error: { code, message: "boom", ...(details ? { details } : {}) },
    requestId: "req_1",
  };
}

describe("mapSubmitResult", () => {
  it("maps a 201 to the pending-verification flow", () => {
    const outcome = mapSubmitResult({
      data: { status: "created", id: "reg_1" },
    });

    assert.deepEqual(outcome, { kind: "created", id: "reg_1" });
  });

  it("tells a closed campaign apart from a duplicate registration", () => {
    assert.deepEqual(mapSubmitResult({ error: apiError("CONFLICT") }), {
      kind: "closed",
    });
    assert.deepEqual(
      mapSubmitResult({ error: apiError("ALREADY_REGISTERED") }),
      {
        kind: "alreadyRegistered",
      },
    );
  });

  it("flattens validation details to top-level field issues", () => {
    const outcome = mapSubmitResult({
      error: apiError("VALIDATION_ERROR", [
        { path: ["phone"], message: "Número no vàlid" },
        { path: ["profile", "name"], message: "Massa curt" },
        { path: [], message: "Sense camp" },
      ]),
    });

    assert.deepEqual(outcome, {
      kind: "invalid",
      issues: [
        { field: "phone", message: "Número no vàlid" },
        { field: "profile", message: "Massa curt" },
      ],
    });
  });

  it("treats a validation error without details as an empty issue list", () => {
    assert.deepEqual(mapSubmitResult({ error: apiError("VALIDATION_ERROR") }), {
      kind: "invalid",
      issues: [],
    });
  });

  it("falls back to the generic failure for any other error code", () => {
    for (const code of [
      "INTERNAL_ERROR",
      "PAYLOAD_TOO_LARGE",
      "UNSUPPORTED_MEDIA_TYPE",
      "NOT_FOUND",
    ] as const) {
      assert.deepEqual(mapSubmitResult({ error: apiError(code) }), {
        kind: "failed",
      });
    }
  });

  it("fails rather than inventing a success when the body is empty", () => {
    assert.deepEqual(mapSubmitResult({}), { kind: "failed" });
  });
});

describe("mapVerifyResult", () => {
  it("maps a verified body to the pending-review screen", () => {
    assert.deepEqual(mapVerifyResult({ data: { status: "verified" } }), {
      kind: "verified",
    });
  });

  it("maps INVALID_TOKEN to the expired-link screen", () => {
    assert.deepEqual(mapVerifyResult({ error: apiError("INVALID_TOKEN") }), {
      kind: "invalidToken",
    });
  });

  it("keeps other errors on the retryable failure screen", () => {
    assert.deepEqual(mapVerifyResult({ error: apiError("INTERNAL_ERROR") }), {
      kind: "failed",
    });
    assert.deepEqual(mapVerifyResult({}), { kind: "failed" });
  });
});

describe("readToken", () => {
  it("keeps a real token and drops anything blank", () => {
    assert.equal(readToken(" abc123 "), "abc123");
    assert.equal(readToken(""), undefined);
    assert.equal(readToken("   "), undefined);
    assert.equal(readToken(null), undefined);
    assert.equal(readToken(undefined), undefined);
  });
});

describe("readRegistrationId", () => {
  it("accepts an opaque id", () => {
    assert.equal(
      readRegistrationId("3f2504e0-4f89-11d3-9a0c-0305e82c3301"),
      "3f2504e0-4f89-11d3-9a0c-0305e82c3301",
    );
  });

  it("drops anything that could not address the resend endpoint", () => {
    assert.equal(readRegistrationId("../../admin"), undefined);
    assert.equal(readRegistrationId("a b"), undefined);
    assert.equal(readRegistrationId("x".repeat(129)), undefined);
    assert.equal(readRegistrationId(null), undefined);
  });
});
