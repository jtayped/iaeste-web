import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { components } from "@repo/api-client";

import {
  mapStartResult,
  mapSubmitResult,
  mapVerifyCodeResult,
  mapVerifyResult,
  readRegistrationId,
  readToken,
} from "./registration-flow";

/** `openapi-fetch` hands back the raw Response; only its status is read. */
function status(code: number) {
  return { status: code } as Response;
}

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

  it("sends a lapsed email session back to the first step, not to a retry", () => {
    assert.deepEqual(mapSubmitResult({ error: apiError("INVALID_TOKEN") }), {
      kind: "expiredSession",
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

describe("mapStartResult", () => {
  it("carries the cooldown through on success", () => {
    assert.deepEqual(
      mapStartResult({ data: { status: "ok", resendAfterSeconds: 60 } }),
      { kind: "sent", resendAfterSeconds: 60 },
    );
  });

  it("separates a rate limit from a closed campaign, which share a code", () => {
    assert.deepEqual(
      mapStartResult({
        error: apiError("CONFLICT"),
        response: status(429),
      }),
      { kind: "rateLimited" },
    );
    assert.deepEqual(
      mapStartResult({ error: apiError("CONFLICT"), response: status(409) }),
      { kind: "closed" },
    );
  });

  it("surfaces a malformed address as a field issue", () => {
    assert.deepEqual(
      mapStartResult({
        error: apiError("VALIDATION_ERROR", [
          { path: ["email"], message: "no és vàlida" },
        ]),
        response: status(422),
      }),
      {
        kind: "invalid",
        issues: [{ field: "email", message: "no és vàlida" }],
      },
    );
  });
});

describe("mapVerifyCodeResult", () => {
  const session = {
    token: "t",
    expiresAt: "2026-09-01T00:00:00.000Z",
    email: "joan@alumnes.udl.cat",
    known: true,
    profile: null,
    memberships: [],
    openCampaignRegistrationStatus: null,
  };

  it("hands the session through on success", () => {
    assert.deepEqual(mapVerifyCodeResult({ data: session }), {
      kind: "ok",
      session,
    });
  });

  it("collapses every rejected code into one outcome", () => {
    assert.deepEqual(
      mapVerifyCodeResult({
        error: apiError("INVALID_TOKEN"),
        response: status(400),
      }),
      { kind: "badCode" },
    );
  });

  it("keeps a rate limit apart, because waiting actually helps there", () => {
    assert.deepEqual(
      mapVerifyCodeResult({
        error: apiError("CONFLICT"),
        response: status(429),
      }),
      { kind: "rateLimited" },
    );
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
  it("keeps a real token and drops malformed values", () => {
    const token = "a1".repeat(32);

    assert.equal(readToken(` ${token} `), token);
    assert.equal(readToken(""), undefined);
    assert.equal(readToken("   "), undefined);
    assert.equal(readToken("abc123"), undefined);
    assert.equal(readToken("g".repeat(64)), undefined);
    assert.equal(readToken("a".repeat(65)), undefined);
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
