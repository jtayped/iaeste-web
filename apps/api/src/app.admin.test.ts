import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { IllegalTransitionError, NotFoundError } from "@repo/db/repositories";

import {
  createRegistrationServiceStub,
  createStubAuth,
  createTestApp,
} from "./test-support/app";

describe("resend-verification", () => {
  it("always returns the same generic 200, regardless of what the service actually did", async () => {
    let calledWith: string | undefined;
    const app = createTestApp(
      undefined,
      createRegistrationServiceStub({
        resendVerification: async (id) => {
          calledWith = id;
        },
      }),
    );

    const response = await app.request(
      "/v1/registrations/does-not-exist/resend-verification",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
      },
    );
    const body = (await response.json()) as { status: string };

    assert.equal(response.status, 200);
    assert.equal(body.status, "ok");
    assert.equal(calledWith, "does-not-exist");
  });
});

describe("verify", () => {
  it("GET verifies via a query param", async () => {
    let receivedToken: string | undefined;
    const app = createTestApp(
      undefined,
      createRegistrationServiceStub({
        verify: async (token) => {
          receivedToken = token;
        },
      }),
    );

    const response = await app.request(
      "/v1/registrations/verify?token=raw-token-value",
    );

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: "verified" });
    assert.equal(receivedToken, "raw-token-value");
  });

  it("POST verifies via a JSON body", async () => {
    let receivedToken: string | undefined;
    const app = createTestApp(
      undefined,
      createRegistrationServiceStub({
        verify: async (token) => {
          receivedToken = token;
        },
      }),
    );

    const response = await app.request("/v1/registrations/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: "raw-token-value" }),
    });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: "verified" });
    assert.equal(receivedToken, "raw-token-value");
  });

  it("returns a generic INVALID_TOKEN error for a bad/expired/used token", async () => {
    const app = createTestApp(
      undefined,
      createRegistrationServiceStub({
        verify: async () => {
          throw new IllegalTransitionError("token is expired");
        },
      }),
    );

    const response = await app.request("/v1/registrations/verify?token=stale");
    const body = (await response.json()) as { error: { code: string } };

    assert.equal(response.status, 400);
    assert.equal(body.error.code, "INVALID_TOKEN");
  });
});

describe("admin registrations", () => {
  it("requires campaignId", async () => {
    const app = createTestApp();
    const response = await app.request("/v1/admin/registrations");
    const body = (await response.json()) as { error: { code: string } };

    assert.equal(response.status, 422);
    assert.equal(body.error.code, "VALIDATION_ERROR");
  });

  it("lists registrations for a campaign, optionally filtered by status", async () => {
    let receivedArgs: unknown[] = [];
    const app = createTestApp(
      undefined,
      createRegistrationServiceStub({
        list: async ({ campaignId, status, limit, offset }) => {
          receivedArgs = [campaignId, status];
          return { rows: [], total: 0, limit, offset };
        },
      }),
    );

    const response = await app.request(
      "/v1/admin/registrations?campaignId=campaign_1&status=pending_review",
    );

    assert.equal(response.status, 200);
    assert.deepEqual(receivedArgs, ["campaign_1", "pending_review"]);
  });

  it("accepts a registration", async () => {
    const app = createTestApp(
      undefined,
      createRegistrationServiceStub({
        accept: async () => ({ notificationSent: true }),
      }),
    );

    const response = await app.request(
      "/v1/admin/registrations/registration_1/accept",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      },
    );

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      status: "accepted",
      notificationSent: true,
    });
  });

  it("reports accepted-but-notification-failed distinctly from full success", async () => {
    const app = createTestApp(
      undefined,
      createRegistrationServiceStub({
        accept: async () => ({ notificationSent: false }),
      }),
    );

    const response = await app.request(
      "/v1/admin/registrations/registration_1/accept",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      },
    );

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      status: "accepted",
      notificationSent: false,
    });
  });

  it("maps a missing registration to 404", async () => {
    const app = createTestApp(
      undefined,
      createRegistrationServiceStub({
        accept: async () => {
          throw new NotFoundError("no such registration");
        },
      }),
    );

    const response = await app.request(
      "/v1/admin/registrations/missing/accept",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      },
    );
    const body = (await response.json()) as { error: { code: string } };

    assert.equal(response.status, 404);
    assert.equal(body.error.code, "NOT_FOUND");
  });

  it("maps a wrong-status registration to 409", async () => {
    const app = createTestApp(
      undefined,
      createRegistrationServiceStub({
        accept: async () => {
          throw new IllegalTransitionError("not pending_review");
        },
      }),
    );

    const response = await app.request(
      "/v1/admin/registrations/registration_1/accept",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      },
    );
    const body = (await response.json()) as { error: { code: string } };

    assert.equal(response.status, 409);
    assert.equal(body.error.code, "CONFLICT");
  });

  it("rejects a registration", async () => {
    let receivedInput: unknown;
    const app = createTestApp(
      undefined,
      createRegistrationServiceStub({
        reject: async (id, input) => {
          receivedInput = { id, ...input };
          return { notificationSent: true };
        },
      }),
    );

    const response = await app.request(
      "/v1/admin/registrations/registration_1/reject",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason: "No hi ha places." }),
      },
    );

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      status: "rejected",
      notificationSent: true,
    });
    assert.deepEqual(receivedInput, {
      id: "registration_1",
      reviewerId: "user_admin",
      reason: "No hi ha places.",
    });
  });
});

describe("admin authorization (IA-31)", () => {
  const listUrl = "/v1/admin/registrations?campaignId=campaign_1";

  it("keeps admin dashboard data hidden from a member", async () => {
    const app = createTestApp(
      undefined,
      createRegistrationServiceStub(),
      undefined,
      createStubAuth({ role: "member" }),
    );
    const response = await app.request("/v1/admin/overview");
    const body = (await response.json()) as { error: { code: string } };

    assert.equal(response.status, 403);
    assert.equal(body.error.code, "FORBIDDEN");
  });

  it("401s when there is no session", async () => {
    const app = createTestApp(
      undefined,
      createRegistrationServiceStub(),
      undefined,
      createStubAuth(null),
    );
    const response = await app.request(listUrl);
    const body = (await response.json()) as { error: { code: string } };

    assert.equal(response.status, 401);
    assert.equal(body.error.code, "UNAUTHENTICATED");
  });

  it("403s a member (role lacks registrations.review)", async () => {
    const app = createTestApp(
      undefined,
      createRegistrationServiceStub(),
      undefined,
      createStubAuth({ role: "member" }),
    );
    const response = await app.request(listUrl);
    const body = (await response.json()) as { error: { code: string } };

    assert.equal(response.status, 403);
    assert.equal(body.error.code, "FORBIDDEN");
  });

  it("403s an admin who has not completed onboarding", async () => {
    const app = createTestApp(
      undefined,
      createRegistrationServiceStub(),
      undefined,
      createStubAuth({ role: "admin" }),
      async () => false,
    );
    const response = await app.request(listUrl);
    const body = (await response.json()) as { error: { code: string } };

    assert.equal(response.status, 403);
    assert.equal(body.error.code, "FORBIDDEN");
  });

  it("lets an onboarded admin through", async () => {
    let called = false;
    const app = createTestApp(
      undefined,
      createRegistrationServiceStub({
        list: async ({ limit, offset }) => {
          called = true;
          return { rows: [], total: 0, limit, offset };
        },
      }),
      undefined,
      createStubAuth({ role: "admin" }),
    );
    const response = await app.request(listUrl);

    assert.equal(response.status, 200);
    assert.equal(called, true);
  });

  it("uses the session user as the reviewer on accept, ignoring the body", async () => {
    let receivedInput: unknown;
    const app = createTestApp(
      undefined,
      createRegistrationServiceStub({
        accept: async (id, input) => {
          receivedInput = { id, ...input };
          return { notificationSent: true };
        },
      }),
      undefined,
      createStubAuth({ id: "user_reviewer_9", role: "admin" }),
    );

    const response = await app.request(
      "/v1/admin/registrations/registration_1/accept",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reviewerId: "user_forged" }),
      },
    );

    assert.equal(response.status, 200);
    assert.deepEqual(receivedInput, {
      id: "registration_1",
      reviewerId: "user_reviewer_9",
    });
  });
});
