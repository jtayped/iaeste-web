import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import { eq } from "drizzle-orm";

import type { Database } from "../client";
import { user } from "../schema/auth";
import { userEmail } from "../schema/user-email";
import { closeTestDb, getTestDb, truncateAll } from "../test-support/db";
import { createTestUser } from "../test-support/fixtures";
import {
  DuplicateEmailSlotsError,
  EmailAddressInUseError,
  LastEmailRemovalError,
} from "./errors";
import { createUserEmailRepository } from "./user-emails";

describe("user-email repository — admin edits", () => {
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

  async function canonicalEmail(userId: string) {
    const [row] = await db
      .select({ email: user.email })
      .from(user)
      .where(eq(user.id, userId));
    return row?.email;
  }

  it("sets both slots already verified and syncs the canonical email to the personal one", async () => {
    const u = await createTestUser(db, { email: "old@alumnes.udl.cat" });
    const repo = createUserEmailRepository(db);

    const result = await repo.setForUser(u.id, {
      university: "  New.Uni@ALUMNES.UDL.CAT ",
      personal: "person@gmail.com",
    });

    assert.equal(result.university?.email, "new.uni@alumnes.udl.cat");
    assert.equal(result.personal?.email, "person@gmail.com");
    assert.ok(result.university?.verifiedAt instanceof Date);
    assert.ok(result.personal?.verifiedAt instanceof Date);
    assert.equal(await canonicalEmail(u.id), "person@gmail.com");

    const listed = await repo.listForUser(u.id);
    assert.deepEqual(
      { u: listed.university?.email, p: listed.personal?.email },
      { u: "new.uni@alumnes.udl.cat", p: "person@gmail.com" },
    );
  });

  it("leaves an omitted slot untouched and clears a slot set to null", async () => {
    const u = await createTestUser(db);
    const repo = createUserEmailRepository(db);
    await repo.setForUser(u.id, {
      university: "uni@udl.cat",
      personal: "me@gmail.com",
    });

    // Only touch `personal`; `university` must survive unchanged.
    const result = await repo.setForUser(u.id, { personal: null });

    assert.equal(result.university?.email, "uni@udl.cat");
    assert.equal(result.personal, null);
    // Canonical falls back to the university address once personal is gone.
    assert.equal(await canonicalEmail(u.id), "uni@udl.cat");
  });

  it("refuses an edit that would leave the member with no address", async () => {
    const u = await createTestUser(db);
    const repo = createUserEmailRepository(db);
    await repo.setForUser(u.id, { university: "only@udl.cat" });

    await assert.rejects(
      repo.setForUser(u.id, { university: null }),
      LastEmailRemovalError,
    );
    // Nothing changed.
    const listed = await repo.listForUser(u.id);
    assert.equal(listed.university?.email, "only@udl.cat");
  });

  it("rejects an address already linked to another account", async () => {
    const other = await createTestUser(db);
    const repo = createUserEmailRepository(db);
    await repo.setForUser(other.id, { personal: "taken@gmail.com" });

    const u = await createTestUser(db);
    await repo.setForUser(u.id, { university: "mine@udl.cat" });

    await assert.rejects(
      repo.setForUser(u.id, { personal: "taken@gmail.com" }),
      EmailAddressInUseError,
    );
  });

  it("rejects an address that is another account's canonical email", async () => {
    const other = await createTestUser(db, { email: "canon@gmail.com" });
    assert.ok(other.id);
    const u = await createTestUser(db);
    const repo = createUserEmailRepository(db);
    await repo.setForUser(u.id, { university: "mine@udl.cat" });

    await assert.rejects(
      repo.setForUser(u.id, { personal: "canon@gmail.com" }),
      EmailAddressInUseError,
    );
  });

  it("lets a member keep their own address when editing the other slot", async () => {
    const u = await createTestUser(db);
    const repo = createUserEmailRepository(db);
    await repo.setForUser(u.id, {
      university: "keep@udl.cat",
      personal: "old@gmail.com",
    });

    // Re-submitting the unchanged university address must not read as a clash.
    const result = await repo.setForUser(u.id, {
      university: "keep@udl.cat",
      personal: "new@gmail.com",
    });
    assert.equal(result.university?.email, "keep@udl.cat");
    assert.equal(result.personal?.email, "new@gmail.com");

    const rows = await db
      .select()
      .from(userEmail)
      .where(eq(userEmail.userId, u.id));
    assert.equal(rows.length, 2);
  });

  it("swaps the two slots without tripping the global email index", async () => {
    const u = await createTestUser(db);
    const repo = createUserEmailRepository(db);
    await repo.setForUser(u.id, {
      university: "uni@udl.cat",
      personal: "person@gmail.com",
    });

    const result = await repo.setForUser(u.id, {
      university: "person@gmail.com",
      personal: "uni@udl.cat",
    });

    assert.equal(result.university?.email, "person@gmail.com");
    assert.equal(result.personal?.email, "uni@udl.cat");
    assert.equal(await canonicalEmail(u.id), "uni@udl.cat");
  });

  it("rejects the same address in both slots", async () => {
    const u = await createTestUser(db);
    const repo = createUserEmailRepository(db);

    await assert.rejects(
      repo.setForUser(u.id, {
        university: "same@example.com",
        personal: "same@example.com",
      }),
      DuplicateEmailSlotsError,
    );
  });
});
