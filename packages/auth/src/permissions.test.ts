import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { can, capabilities } from "./permissions";

describe("can", () => {
  const admin = { user: { role: "admin" } };
  const member = { user: { role: "member" } };

  it("grants an admin every capability", () => {
    for (const capability of capabilities) {
      assert.equal(can(admin, capability), true, capability);
    }
  });

  it("only grants a member access to the app shell", () => {
    assert.equal(can(member, "admin.access"), true);

    for (const capability of capabilities) {
      if (capability === "admin.access") continue;
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
