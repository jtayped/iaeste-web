import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { z } from "zod";

import {
  campaignListQuerySchema,
  CAMPAIGN_DEFAULT_SORT,
  invitationListQuerySchema,
  listPageSchema,
  listQuerySchema,
  memberListQuerySchema,
  MEMBER_DEFAULT_SORT,
  MEMBER_SORT_KEYS,
  registrationListQuerySchema,
  REGISTRATION_DEFAULT_SORT,
} from "./admin-list";

const schema = listQuerySchema({
  sortKeys: ["name", "createdAt"],
  defaultSort: { key: "createdAt", dir: "desc" },
  search: 10,
  limit: { default: 25, max: 100 },
});

describe("listQuerySchema", () => {
  it("applies every default when the query is empty", () => {
    assert.deepEqual(schema.parse({}), {
      sort: "createdAt",
      dir: "desc",
      limit: 25,
      offset: 0,
    });
  });

  it("rejects a sort key it does not declare", () => {
    const result = schema.safeParse({ sort: "bogus" });
    assert.equal(result.success, false);
  });

  it("rejects a direction that is not asc or desc", () => {
    assert.equal(schema.safeParse({ dir: "descending" }).success, false);
  });

  it("defaults sort and dir independently", () => {
    // `?dir=asc` alone is "the default column, ascending" — what the admin
    // produces once it strips the parameter sitting at its default.
    assert.equal(schema.parse({ dir: "asc" }).sort, "createdAt");
    assert.equal(schema.parse({ sort: "name" }).dir, "desc");
  });

  it("coerces limit and offset from strings and clamps them", () => {
    assert.equal(schema.parse({ limit: "10" }).limit, 10);
    assert.equal(schema.parse({ offset: "40" }).offset, 40);
    assert.equal(schema.safeParse({ limit: "0" }).success, false);
    assert.equal(schema.safeParse({ limit: "101" }).success, false);
    assert.equal(schema.safeParse({ offset: "-1" }).success, false);
  });

  it("trims q and caps its length", () => {
    assert.equal(schema.parse({ q: "  marti  " }).q, "marti");
    assert.equal(schema.safeParse({ q: "x".repeat(11) }).success, false);
  });
});

describe("listPageSchema", () => {
  const page = listPageSchema(z.object({ id: z.string() }));

  it("accepts a well-formed envelope", () => {
    const parsed = page.parse({
      rows: [{ id: "a" }],
      total: 1,
      limit: 25,
      offset: 0,
    });
    assert.equal(parsed.total, 1);
  });

  it("rejects a negative total", () => {
    assert.equal(
      page.safeParse({ rows: [], total: -1, limit: 25, offset: 0 }).success,
      false,
    );
  });

  it("rejects a zero limit", () => {
    assert.equal(
      page.safeParse({ rows: [], total: 0, limit: 0, offset: 0 }).success,
      false,
    );
  });
});

describe("the four endpoint schemas", () => {
  it("defaults members to surnames ascending, today's order", () => {
    const parsed = memberListQuerySchema.parse({});
    assert.equal(parsed.sort, MEMBER_DEFAULT_SORT.key);
    assert.equal(parsed.dir, MEMBER_DEFAULT_SORT.dir);
    assert.equal(parsed.limit, 25);
  });

  it("sorts members by nom and cognoms independently", () => {
    // The two are separate keys, not one "order by name" that means both.
    assert.ok(MEMBER_SORT_KEYS.includes("name"));
    assert.ok(MEMBER_SORT_KEYS.includes("surnames"));
    assert.equal(memberListQuerySchema.parse({ sort: "name" }).sort, "name");
    assert.equal(
      memberListQuerySchema.parse({ sort: "surnames" }).sort,
      "surnames",
    );
  });

  it("requires a campaignId on registrations and invitations", () => {
    assert.equal(registrationListQuerySchema.safeParse({}).success, false);
    assert.equal(invitationListQuerySchema.safeParse({}).success, false);
    assert.equal(
      registrationListQuerySchema.parse({ campaignId: "c1" }).sort,
      REGISTRATION_DEFAULT_SORT.key,
    );
  });

  it("keeps each endpoint's own filters", () => {
    assert.equal(
      memberListQuerySchema.parse({ filter: "current" }).filter,
      "current",
    );
    assert.equal(
      registrationListQuerySchema.parse({
        campaignId: "c1",
        status: "pending_review",
      }).status,
      "pending_review",
    );
    assert.equal(
      invitationListQuerySchema.parse({ campaignId: "c1", status: "expired" })
        .status,
      "expired",
    );
    assert.equal(
      campaignListQuerySchema.parse({ state: "published" }).state,
      "published",
    );
  });

  it("defaults campaigns to the newest membership start", () => {
    const parsed = campaignListQuerySchema.parse({});
    assert.equal(parsed.sort, CAMPAIGN_DEFAULT_SORT.key);
    assert.equal(parsed.dir, "desc");
    assert.equal(parsed.limit, 100);
  });

  it("rejects a sort key that belongs to a different table", () => {
    // `degree` is a member/registration column; campaigns have no such thing.
    assert.equal(
      campaignListQuerySchema.safeParse({ sort: "degree" }).success,
      false,
    );
  });
});
