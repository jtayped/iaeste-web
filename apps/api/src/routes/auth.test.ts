import assert from "node:assert/strict";
import { after, afterEach, before, describe, it } from "node:test";
import { Children, isValidElement, type ReactNode } from "react";

import { createAuth, revokeAllUserSessions } from "@repo/auth";
import type { Database } from "@repo/db/client";
import { user, userEmail, verification } from "@repo/db/schema";
import { closeTestDb, getTestDb, truncateAll } from "@repo/db/test-support";
import type { Emailer } from "@repo/email/resend";

import { createApp } from "../app";
import {
  createRegistrationServiceStub,
  createRepository,
  quietLogger,
} from "../test-support/app";

const ADMIN_ORIGIN = "https://admin.iaestelleida.cat";
const AUTH_SECRET = "test-secret-with-at-least-thirty-two-characters";

function findHref(node: ReactNode): string | undefined {
  if (!isValidElement<{ href?: unknown; children?: ReactNode }>(node)) {
    return undefined;
  }
  if (typeof node.props.href === "string") return node.props.href;

  for (const child of Children.toArray(node.props.children)) {
    const href = findHref(child);
    if (href) return href;
  }
  return undefined;
}

function createAuthHarness(
  db: Database,
  options: {
    baseURL?: string;
    origin?: string;
    runtime?: "development" | "test" | "production";
    insecureCookies?: boolean;
  } = {},
) {
  let magicLink: string | undefined;
  let deliveredTo: string | undefined;
  const origin = options.origin ?? ADMIN_ORIGIN;
  const emailer: Emailer = {
    async send(message) {
      deliveredTo = Array.isArray(message.to) ? message.to[0] : message.to;
      magicLink = findHref(message.react);
      assert.ok(magicLink, "the email must contain the sign-in link");
    },
  };
  const auth = createAuth({
    db,
    emailer,
    baseURL: options.baseURL ?? ADMIN_ORIGIN,
    secret: AUTH_SECRET,
    trustedOrigins: [origin],
    runtime: options.runtime ?? "test",
    insecureCookies: options.insecureCookies,
  });
  const app = createApp({
    auth,
    logger: quietLogger,
    registrationRepository: createRepository(),
    registrationService: createRegistrationServiceStub(),
    db,
  });

  return {
    app,
    auth,
    getMagicLink() {
      assert.ok(magicLink, "a magic-link email should have been recorded");
      return magicLink;
    },
    getDeliveredTo() {
      return deliveredTo;
    },
  };
}

async function requestMagicLink(
  app: ReturnType<typeof createApp>,
  email: string,
  origin = ADMIN_ORIGIN,
) {
  return app.request("/api/auth/sign-in/magic-link", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin,
    },
    body: JSON.stringify({ email }),
  });
}

function sessionCookie(response: Response) {
  const setCookie = response.headers.get("set-cookie");
  assert.ok(setCookie, "verification must set the session cookie");
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /Secure/i);
  assert.match(setCookie, /SameSite=Lax/i);
  assert.doesNotMatch(setCookie, /Domain=/i);
  const separator = setCookie.indexOf(";");
  return separator === -1 ? setCookie : setCookie.slice(0, separator);
}

describe("Better Auth routes", () => {
  let db: Database;

  before(async () => {
    db = await getTestDb();
  });

  afterEach(async () => {
    await truncateAll(db);
  });

  after(async () => {
    await closeTestDb();
  });

  it("rejects an untrusted browser origin before sending email", async () => {
    const { app } = createAuthHarness(db);
    const response = await requestMagicLink(
      app,
      "member@alumnes.udl.cat",
      "https://attacker.example",
    );

    assert.equal(response.status, 403);
    assert.equal(response.headers.get("access-control-allow-origin"), null);
    assert.equal((await db.select().from(verification)).length, 0);
  });

  it("does not create an account for an unknown email", async () => {
    const email = "unknown@alumnes.udl.cat";
    const { app, getMagicLink } = createAuthHarness(db);

    const request = await requestMagicLink(app, email);
    assert.equal(request.status, 200);

    const verificationResponse = await app.request(getMagicLink());
    assert.equal(verificationResponse.status, 302);
    assert.match(
      verificationResponse.headers.get("location") ?? "",
      /error=new_user_signup_disabled/,
    );
    assert.equal(verificationResponse.headers.get("set-cookie"), null);
    assert.equal((await db.select().from(user)).length, 0);
  });

  it("uses a host-only non-secure cookie on local HTTP", async () => {
    const localAdminOrigin = "http://localhost:3005";
    const email = "local-member@alumnes.udl.cat";
    await db.insert(user).values({
      id: crypto.randomUUID(),
      name: "local member",
      email,
      emailVerified: true,
      role: "member",
    });
    const { app, getMagicLink } = createAuthHarness(db, {
      baseURL: localAdminOrigin,
      origin: localAdminOrigin,
      runtime: "development",
      insecureCookies: true,
    });

    const request = await requestMagicLink(app, email, localAdminOrigin);
    assert.equal(request.status, 200);
    const link = getMagicLink();
    assert.equal(new URL(link).origin, localAdminOrigin);
    const response = await app.request(link);
    assert.equal(response.status, 302);
    const setCookie = response.headers.get("set-cookie");
    assert.ok(setCookie);
    assert.match(setCookie, /HttpOnly/i);
    assert.match(setCookie, /SameSite=Lax/i);
    assert.doesNotMatch(setCookie, /Secure/i);
    assert.doesNotMatch(setCookie, /Domain=/i);
  });

  it("signs in an existing member and revokes every session", async () => {
    const userId = crypto.randomUUID();
    const email = "member@alumnes.udl.cat";
    await db.insert(user).values({
      id: userId,
      name: "member",
      email,
      emailVerified: true,
      role: "member",
    });
    const { app, auth, getMagicLink } = createAuthHarness(db);

    const request = await requestMagicLink(app, email);
    assert.equal(request.status, 200);
    assert.equal(request.headers.get("access-control-allow-origin"), null);

    const link = new URL(getMagicLink());
    const rawToken = link.searchParams.get("token");
    assert.ok(rawToken);
    const stored = await db.select().from(verification);
    assert.equal(stored.length, 1);
    assert.notEqual(stored[0]?.identifier, rawToken);

    const firstVerification = await app.request(link.toString());
    assert.equal(firstVerification.status, 302);
    const firstCookie = sessionCookie(firstVerification);

    const secondRequest = await requestMagicLink(app, email);
    assert.equal(secondRequest.status, 200);
    const secondVerification = await app.request(getMagicLink());
    assert.equal(secondVerification.status, 302);
    const secondCookie = sessionCookie(secondVerification);

    const signedIn = await app.request("/api/auth/get-session", {
      headers: { cookie: firstCookie },
    });
    assert.equal(signedIn.status, 200);
    assert.equal(
      ((await signedIn.json()) as { user: { email: string } }).user.email,
      email,
    );

    const deniedRevocation = await app.request("/api/auth/revoke-sessions", {
      method: "POST",
      headers: {
        cookie: firstCookie,
        origin: "https://attacker.example",
      },
    });
    assert.equal(deniedRevocation.status, 403);

    const stillSignedIn = await app.request("/api/auth/get-session", {
      headers: { cookie: firstCookie },
    });
    assert.notEqual(await stillSignedIn.json(), null);

    const secondStillSignedIn = await app.request("/api/auth/get-session", {
      headers: { cookie: secondCookie },
    });
    assert.notEqual(await secondStillSignedIn.json(), null);

    await revokeAllUserSessions(auth, userId);

    const firstSignedOut = await app.request("/api/auth/get-session", {
      headers: { cookie: firstCookie },
    });
    assert.equal(firstSignedOut.status, 200);
    assert.equal(await firstSignedOut.json(), null);

    const secondSignedOut = await app.request("/api/auth/get-session", {
      headers: { cookie: secondCookie },
    });
    assert.equal(secondSignedOut.status, 200);
    assert.equal(await secondSignedOut.json(), null);
  });

  it("signs the canonical user in through either verified address", async () => {
    const userId = crypto.randomUUID();
    const personalEmail = "member@example.com";
    const universityEmail = "member@alumnes.udl.cat";
    await db.insert(user).values({
      id: userId,
      name: "member",
      email: personalEmail,
      emailVerified: true,
      role: "member",
    });
    await db.insert(userEmail).values([
      {
        userId,
        email: personalEmail,
        kind: "personal",
        verifiedAt: new Date(),
      },
      {
        userId,
        email: universityEmail,
        kind: "university",
        verifiedAt: new Date(),
      },
    ]);
    const { app, getMagicLink, getDeliveredTo } = createAuthHarness(db);

    const request = await requestMagicLink(app, universityEmail);
    assert.equal(request.status, 200);
    assert.equal(getDeliveredTo(), universityEmail);

    const verified = await app.request(getMagicLink());
    const cookie = sessionCookie(verified);
    const session = await app.request("/api/auth/get-session", {
      headers: { cookie },
    });
    assert.equal(
      ((await session.json()) as { user: { id: string; email: string } }).user
        .id,
      userId,
    );
  });
});
