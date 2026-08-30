import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Registration } from "@repo/constants/validators/registration";

import {
  RegistrationAlreadyExistsError,
  RegistrationsClosedError,
} from "./repositories/registrations";
import {
  createRepository,
  createTestApp,
  OPEN_REGISTRATION_STATUS,
  validRegistration,
} from "./test-support/app";

describe("API", () => {
  it("reports its health", async () => {
    const response = await createTestApp().request("/health");

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      status: "ok",
      version: "1.0.0",
    });
    assert.ok(response.headers.get("x-request-id"));
  });

  it("publishes an OpenAPI 3.1 document", async () => {
    const response = await createTestApp().request("/openapi.json");
    const document = (await response.json()) as {
      openapi: string;
      paths: Record<string, unknown>;
    };

    assert.equal(response.status, 200);
    assert.equal(document.openapi, "3.1.0");
    assert.ok(document.paths["/v1/registrations"]);
    assert.ok(document.paths["/v1/registrations/status"]);
  });

  it("reports whether a campaign accepts public registrations", async () => {
    const openResponse = await createTestApp().request(
      "/v1/registrations/status",
    );
    // Closed but upcoming: the window is still published so the public site
    // has something to count down to.
    const closedResponse = await createTestApp(undefined, undefined, async () => ({
      open: false,
      opensAt: "2027-01-10T08:00:00.000Z",
      closesAt: "2027-02-10T22:00:00.000Z",
    })).request("/v1/registrations/status");
    const noneResponse = await createTestApp(undefined, undefined, async () => ({
      open: false,
      opensAt: null,
      closesAt: null,
    })).request("/v1/registrations/status");

    assert.equal(openResponse.status, 200);
    assert.deepEqual(await openResponse.json(), OPEN_REGISTRATION_STATUS);
    assert.equal(closedResponse.status, 200);
    assert.deepEqual(await closedResponse.json(), {
      open: false,
      opensAt: "2027-01-10T08:00:00.000Z",
      closesAt: "2027-02-10T22:00:00.000Z",
    });
    assert.equal(noneResponse.status, 200);
    assert.deepEqual(await noneResponse.json(), {
      open: false,
      opensAt: null,
      closesAt: null,
    });
  });

  it("creates a validated registration", async () => {
    let saved: Registration | undefined;
    const app = createTestApp(
      createRepository(async (registration) => {
        saved = registration;
        return { id: "registration_123" };
      }),
    );
    const response = await app.request("/v1/registrations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(validRegistration),
    });

    assert.equal(response.status, 201);
    assert.deepEqual(saved, validRegistration);
    assert.deepEqual(await response.json(), {
      status: "created",
      id: "registration_123",
    });
  });

  it("reports registration as closed distinctly from other repository errors", async () => {
    const app = createTestApp(
      createRepository(async () => {
        throw new RegistrationsClosedError();
      }),
    );
    const response = await app.request("/v1/registrations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(validRegistration),
    });
    const body = (await response.json()) as { error: { code: string } };

    assert.equal(response.status, 409);
    assert.equal(body.error.code, "CONFLICT");
  });

  it("reports a duplicate registration distinctly from a closed campaign", async () => {
    const app = createTestApp(
      createRepository(async () => {
        throw new RegistrationAlreadyExistsError();
      }),
    );
    const response = await app.request("/v1/registrations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(validRegistration),
    });
    const body = (await response.json()) as { error: { code: string } };

    assert.equal(response.status, 409);
    assert.equal(body.error.code, "ALREADY_REGISTERED");
  });

  it("rejects invalid registration data", async () => {
    let saveCount = 0;
    const app = createTestApp(
      createRepository(async () => {
        saveCount += 1;
        return { id: "registration_123" };
      }),
    );
    const response = await app.request("/v1/registrations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...validRegistration, email: "not-an-email" }),
    });
    const body = (await response.json()) as {
      error: { code: string };
      requestId: string;
    };

    assert.equal(response.status, 422);
    assert.equal(body.error.code, "VALIDATION_ERROR");
    assert.ok(body.requestId);
    assert.equal(saveCount, 0);
  });

  it("does not accept a JSON body without its media type", async () => {
    const response = await createTestApp().request("/v1/registrations", {
      method: "POST",
      body: JSON.stringify(validRegistration),
    });

    assert.equal(response.status, 415);
  });

  it("limits registration request bodies", async () => {
    const response = await createTestApp().request("/v1/registrations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...validRegistration, note: "x".repeat(40_000) }),
    });
    const body = (await response.json()) as { error: { code: string } };

    assert.equal(response.status, 413);
    assert.equal(body.error.code, "PAYLOAD_TOO_LARGE");
  });

  it("only allows configured browser origins", async () => {
    const app = createTestApp();
    const allowed = await app.request("/v1/registrations", {
      method: "OPTIONS",
      headers: {
        origin: "http://localhost:3003",
        "access-control-request-method": "POST",
      },
    });
    const denied = await app.request("/v1/registrations", {
      method: "OPTIONS",
      headers: {
        origin: "https://example.com",
        "access-control-request-method": "POST",
      },
    });

    assert.equal(
      allowed.headers.get("access-control-allow-origin"),
      "http://localhost:3003",
    );
    assert.equal(denied.headers.get("access-control-allow-origin"), null);
  });

  it("hides repository errors from clients", async () => {
    const app = createTestApp(
      createRepository(async () => {
        throw new Error("private Google error");
      }),
    );
    const response = await app.request("/v1/registrations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(validRegistration),
    });
    const body = (await response.json()) as {
      error: { code: string; message: string };
    };

    assert.equal(response.status, 500);
    assert.equal(body.error.code, "INTERNAL_ERROR");
    assert.doesNotMatch(body.error.message, /Google/);
  });
});
