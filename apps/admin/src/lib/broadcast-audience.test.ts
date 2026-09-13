import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  invitationsAudience,
  membersAudience,
  registrationsAudience,
} from "./broadcast-audience";
import { bulkAcceptSelection, bulkAcceptSummary } from "./bulk-accept";
import type { AdminBulkAcceptRegistrationsResponse } from "./admin-types";

describe("broadcast audience", () => {
  it("sends ticked rows as ids and nothing about the query", () => {
    assert.deepEqual(
      registrationsAudience(
        { mode: "ids", rowIds: ["a", "b"] },
        { campaignId: "c1", status: "pending_review", q: "puig" },
      ),
      { kind: "registrations", selection: { mode: "ids", rowIds: ["a", "b"] } },
    );
  });

  it("sends the server-side query, not the rows, for a select-all", () => {
    assert.deepEqual(
      registrationsAudience(
        { mode: "all", excludedRowIds: ["skip"] },
        { campaignId: "c1", status: "pending_review", q: "puig" },
      ),
      {
        kind: "registrations",
        selection: {
          mode: "all",
          campaignId: "c1",
          status: "pending_review",
          q: "puig",
          excludedRowIds: ["skip"],
        },
      },
    );
  });

  it("omits an empty search rather than sending q=''", () => {
    assert.deepEqual(
      membersAudience(
        { mode: "all", excludedRowIds: [] },
        { filter: "current" },
      ),
      {
        kind: "members",
        selection: { mode: "all", filter: "current", excludedRowIds: [] },
      },
    );
  });

  it("drops the invitations `all` tab, which the audience has no member for", () => {
    assert.deepEqual(
      invitationsAudience(
        { mode: "all", excludedRowIds: [] },
        { campaignId: "c1", status: "all" },
      ),
      {
        kind: "invitations",
        selection: { mode: "all", campaignId: "c1", excludedRowIds: [] },
      },
    );
    assert.deepEqual(
      invitationsAudience(
        { mode: "all", excludedRowIds: [] },
        { campaignId: "c1", status: "pending" },
      ),
      {
        kind: "invitations",
        selection: {
          mode: "all",
          campaignId: "c1",
          status: "pending",
          excludedRowIds: [],
        },
      },
    );
  });
});

function result(
  overrides: Partial<AdminBulkAcceptRegistrationsResponse>,
): AdminBulkAcceptRegistrationsResponse {
  return {
    requested: 0,
    accepted: 0,
    skipped: 0,
    failed: [],
    notificationsSent: 0,
    notificationsFailed: [],
    ...overrides,
  };
}

describe("bulk accept", () => {
  it("renames the table's row ids to registration ids", () => {
    assert.deepEqual(bulkAcceptSelection({ mode: "ids", rowIds: ["r1"] }, ""), {
      mode: "ids",
      registrationIds: ["r1"],
    });
    assert.deepEqual(
      bulkAcceptSelection({ mode: "all", excludedRowIds: ["r2"] }, "puig"),
      { mode: "all", q: "puig", excludedRegistrationIds: ["r2"] },
    );
  });

  it("names the skips and the missing emails instead of only the wins", () => {
    assert.equal(
      bulkAcceptSummary(
        result({
          requested: 41,
          accepted: 38,
          skipped: 2,
          notificationsSent: 37,
          notificationsFailed: [{ email: "a@udl.cat", reason: "bounced" }],
        }),
      ),
      "38 acceptades · 2 ja estaven revisades · 1 sense correu",
    );
  });

  it("says only what happened when everything worked", () => {
    assert.equal(
      bulkAcceptSummary(
        result({ requested: 1, accepted: 1, notificationsSent: 1 }),
      ),
      "1 acceptada",
    );
  });
});
