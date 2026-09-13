import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import {
  canSend,
  checkRequest,
  clearLimit,
  recordSend,
  resetLimits,
} from "./rate-limit";

const WINDOW_MS = 5 * 60_000;

describe("per-IP window", () => {
  beforeEach(() => resetLimits());

  it("passes a burst that fits the window", () => {
    const now = Date.now();
    // A lecture hall on one NAT'd university address: sixty sign-ups inside
    // half a minute must all get through, which is the whole reason the
    // window is five minutes wide rather than one.
    for (let index = 0; index < 60; index += 1) {
      const verdict = checkRequest("reg-start:udl", 300, WINDOW_MS, now + index * 500);
      assert.equal(verdict.allowed, true, `request ${index}`);
    }
  });

  it("stops a caller that exhausts the window and says when to retry", () => {
    const now = Date.now();
    for (let index = 0; index < 5; index += 1) {
      checkRequest("k", 5, WINDOW_MS, now);
    }

    const verdict = checkRequest("k", 5, WINDOW_MS, now + 60_000);
    assert.equal(verdict.allowed, false);
    // Four minutes left of the five-minute window.
    assert.equal(verdict.retryAfterSeconds, 240);
  });

  it("lets the caller back in once the window has rolled past", () => {
    const now = Date.now();
    for (let index = 0; index < 5; index += 1) {
      checkRequest("k", 5, WINDOW_MS, now);
    }

    assert.equal(
      checkRequest("k", 5, WINDOW_MS, now + WINDOW_MS + 1).allowed,
      true,
    );
  });
});

describe("per-address cooldown", () => {
  beforeEach(() => resetLimits());

  it("holds a second send inside the cooldown", () => {
    recordSend("registration-code:a@b.c");
    assert.equal(canSend("registration-code:a@b.c"), false);
  });

  it("gives the cooldown back when a send is cleared", () => {
    recordSend("registration-code:a@b.c");
    // What `start()` does when the mail provider refused the code: charging
    // someone sixty seconds for an email they never received would be the
    // limiter punishing our outage.
    clearLimit("registration-code:a@b.c");
    assert.equal(canSend("registration-code:a@b.c"), true);
  });
});
