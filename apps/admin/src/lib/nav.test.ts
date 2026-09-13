import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { visibleExternalNavItems, visibleNavGroups } from "./nav";

const labels = (role: string | null, registrationsActive = true) =>
  visibleNavGroups(role, registrationsActive).flatMap((group) =>
    group.items.map((item) => item.label),
  );

describe("sidebar visibility", () => {
  it("shows an admin everything while registrations are open", () => {
    assert.deepEqual(labels("admin"), [
      "dashboard",
      "analítiques",
      "sol·licituds",
      "invitacions",
      "membres",
      "campanyes",
    ]);
  });

  it("drops the intake group out of season", () => {
    assert.deepEqual(labels("admin", false), [
      "dashboard",
      "analítiques",
      "membres",
      "campanyes",
    ]);
  });

  // The whole point of the member tier: the dashboard's aggregate counts and
  // nothing that reaches a person's name, email or phone number — nor the CRM.
  it("shows a member the dashboard and nothing else", () => {
    assert.deepEqual(labels("member"), ["dashboard"]);
  });

  it("shows an unrecognised role nothing at all", () => {
    assert.deepEqual(labels("board"), []);
    assert.deepEqual(labels(null), []);
  });
});

describe("external links", () => {
  it("gives an admin all three products", () => {
    assert.deepEqual(
      visibleExternalNavItems("admin").map((item) => item.key),
      ["web", "blog", "odoo"],
    );
  });

  // The blog CMS and Odoo have their own accounts and no SSO, so for a member
  // they are sign-in pages they cannot pass. The public site is just the site.
  it("leaves a member only the public site", () => {
    assert.deepEqual(
      visibleExternalNavItems("member").map((item) => item.key),
      ["web"],
    );
  });
});
