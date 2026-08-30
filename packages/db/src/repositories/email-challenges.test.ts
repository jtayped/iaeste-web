import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";

import type { Database } from "../client";
import { closeTestDb, getTestDb, truncateAll } from "../test-support/db";
import {
  createEmailChallengeRepository,
  MAX_CHALLENGE_ATTEMPTS,
} from "./email-challenges";

const EMAIL = "person@alumnes.udl.cat";

describe("email challenge repository", () => {
  let db: Database;

  before(async () => {
    db = await getTestDb();
  });

  beforeEach(async () => {
    await truncateAll(db);
  });

  after(async () => {
    await closeTestDb();
  });

  function inAMinute() {
    return new Date(Date.now() + 60_000);
  }

  it("retires the previous challenge when a new code is issued", async () => {
    const challenges = createEmailChallengeRepository(db);

    const first = await challenges.create({
      email: EMAIL,
      codeHash: "hash-1",
      expiresAt: inAMinute(),
    });
    await challenges.create({
      email: EMAIL,
      codeHash: "hash-2",
      expiresAt: inAMinute(),
    });

    // Two live codes would double an attacker's odds per guess and leave the
    // older one usable after the person has moved on to the newer email.
    const active = await challenges.getActive(EMAIL);
    assert.ok(active);
    assert.equal(active?.codeHash, "hash-2");
    assert.notEqual(active?.id, first.id);
  });

  it("never returns an expired challenge as active", async () => {
    const challenges = createEmailChallengeRepository(db);
    await challenges.create({
      email: EMAIL,
      codeHash: "hash-1",
      expiresAt: new Date(Date.now() - 1_000),
    });

    assert.equal(await challenges.getActive(EMAIL), undefined);
  });

  it("keeps challenges for different addresses apart", async () => {
    const challenges = createEmailChallengeRepository(db);
    await challenges.create({
      email: EMAIL,
      codeHash: "hash-mine",
      expiresAt: inAMinute(),
    });
    await challenges.create({
      email: "other@alumnes.udl.cat",
      codeHash: "hash-theirs",
      expiresAt: inAMinute(),
    });

    assert.equal((await challenges.getActive(EMAIL))?.codeHash, "hash-mine");
  });

  it("counts wrong guesses so the attempt cap can end the challenge", async () => {
    const challenges = createEmailChallengeRepository(db);
    const challenge = await challenges.create({
      email: EMAIL,
      codeHash: "hash-1",
      expiresAt: inAMinute(),
    });

    let latest;
    for (let i = 0; i < MAX_CHALLENGE_ATTEMPTS; i += 1) {
      latest = await challenges.recordAttempt(challenge.id);
    }

    assert.equal(latest?.attemptCount, MAX_CHALLENGE_ATTEMPTS);

    await challenges.burn(challenge.id);
    assert.equal(await challenges.getActive(EMAIL), undefined);
  });

  it("issues exactly one session when two requests race the same code", async () => {
    const challenges = createEmailChallengeRepository(db);
    const challenge = await challenges.create({
      email: EMAIL,
      codeHash: "hash-1",
      expiresAt: inAMinute(),
    });

    const first = await challenges.consume(challenge.id, {
      sessionTokenHash: "session-1",
      sessionExpiresAt: inAMinute(),
    });
    const second = await challenges.consume(challenge.id, {
      sessionTokenHash: "session-2",
      sessionExpiresAt: inAMinute(),
    });

    assert.ok(first);
    assert.equal(second, undefined);
    assert.equal((await challenges.getSession("session-1"))?.email, EMAIL);
    assert.equal(await challenges.getSession("session-2"), undefined);
  });

  it("spends a session exactly once, so a double submit cannot register twice", async () => {
    const challenges = createEmailChallengeRepository(db);
    const challenge = await challenges.create({
      email: EMAIL,
      codeHash: "hash-1",
      expiresAt: inAMinute(),
    });
    await challenges.consume(challenge.id, {
      sessionTokenHash: "session-1",
      sessionExpiresAt: inAMinute(),
    });

    assert.equal((await challenges.consumeSession("session-1"))?.email, EMAIL);
    assert.equal(await challenges.consumeSession("session-1"), undefined);
    assert.equal(await challenges.getSession("session-1"), undefined);
  });

  it("refuses a session that has outlived its expiry", async () => {
    const challenges = createEmailChallengeRepository(db);
    const challenge = await challenges.create({
      email: EMAIL,
      codeHash: "hash-1",
      expiresAt: inAMinute(),
    });
    await challenges.consume(challenge.id, {
      sessionTokenHash: "session-1",
      sessionExpiresAt: new Date(Date.now() - 1_000),
    });

    assert.equal(await challenges.getSession("session-1"), undefined);
    assert.equal(await challenges.consumeSession("session-1"), undefined);
  });
});
