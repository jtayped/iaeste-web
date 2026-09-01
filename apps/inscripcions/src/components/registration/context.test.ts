import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Session } from "@/lib/registration-flow";

import { toSessionContext } from "./context";

const base = {
  token: "t",
  expiresAt: "2026-09-01T00:00:00.000Z",
  ready: true,
  known: true,
  profile: null,
  memberships: [],
  openCampaignRegistrationStatus: null,
  willAutoAccept: false,
};

const session = (emails: Session["emails"]): Session =>
  ({ ...base, emails }) as Session;

describe("toSessionContext", () => {
  it("joins both addresses when the draft was started with a pair", () => {
    const context = toSessionContext(
      session({
        university: { maskedAddress: "jo••@alumnes.udl.cat", verified: true },
        personal: { maskedAddress: "jo••@example.com", verified: true },
      }),
    );

    assert.equal(context.email, "jo••@alumnes.udl.cat · jo••@example.com");
  });

  it("shows the university address alone, with no separator left dangling", () => {
    const context = toSessionContext(
      session({
        university: { maskedAddress: "jo••@alumnes.udl.cat", verified: true },
      }),
    );

    assert.equal(context.email, "jo••@alumnes.udl.cat");
  });

  it("shows the personal address alone", () => {
    const context = toSessionContext(
      session({
        personal: { maskedAddress: "jo••@example.com", verified: true },
      }),
    );

    assert.equal(context.email, "jo••@example.com");
  });
});
