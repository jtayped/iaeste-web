import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { can, capabilities, type Capability } from "./permissions";

describe("can", () => {
  const admin = { user: { role: "admin" } };
  const member = { user: { role: "member" } };

  it("grants an admin every capability", () => {
    for (const capability of capabilities) {
      assert.equal(can(admin, capability), true, capability);
    }
  });

  it("grants a member the app shell and the overview, and nothing else", () => {
    const granted: Capability[] = ["admin.access", "dashboard.read"];

    for (const capability of granted) {
      assert.equal(can(member, capability), true, capability);
    }
    for (const capability of capabilities) {
      if (granted.includes(capability)) continue;
      assert.equal(can(member, capability), false, capability);
    }
  });

  // Spelled out rather than left to the loop above: these are the capabilities
  // that gate every route serving somebody else's name, email or phone number,
  // plus the CRM. A grant slipping into `byRole` is the one mistake here that
  // leaks data, so it fails by name.
  it("never lets a member reach personal data or the crm", () => {
    for (const capability of [
      "members.read",
      "registrations.review",
      "invitations.write",
      "broadcasts.send",
      "analytics.read",
    ] as const) {
      assert.equal(can(member, capability), false, capability);
    }
  });

  it("denies a null session", () => {
    assert.equal(can(null, "admin.access"), false);
    assert.equal(can(undefined, "admin.access"), false);
  });

  it("denies an unrecognised or missing role", () => {
    assert.equal(can({ user: { role: "owner" } }, "admin.access"), false);
    assert.equal(can({ user: { role: null } }, "admin.access"), false);
    assert.equal(can({ user: {} }, "admin.access"), false);
  });
});
