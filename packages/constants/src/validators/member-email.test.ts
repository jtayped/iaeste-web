import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isUniversityEmail,
  memberEmailSchema,
  memberEmailsSchema,
  toMemberEmails,
} from "./member-email";

describe("member email validation", () => {
  it("recognises only the two university domains", () => {
    assert.equal(isUniversityEmail("NOM@UDL.CAT"), true);
    assert.equal(isUniversityEmail("nom@alumnes.udl.cat"), true);
    assert.equal(isUniversityEmail("nom@sub.udl.cat"), false);
    assert.equal(isUniversityEmail("nom@fakeudl.cat"), false);
  });

  it("accepts a university address, a personal address, or both", () => {
    assert.equal(
      memberEmailsSchema.safeParse({
        universityEmail: "nom@alumnes.udl.cat",
        personalEmail: "nom@example.com",
      }).success,
      true,
    );
    assert.equal(
      memberEmailsSchema.safeParse({ universityEmail: "nom@alumnes.udl.cat" })
        .success,
      true,
    );
    assert.equal(
      memberEmailsSchema.safeParse({ personalEmail: "nom@example.com" })
        .success,
      true,
    );
  });

  it("rejects neither address", () => {
    const result = memberEmailsSchema.safeParse({});
    assert.equal(result.success, false);
  });

  it("treats a blank field as not supplied", () => {
    assert.equal(
      memberEmailsSchema.safeParse({
        universityEmail: "nom@alumnes.udl.cat",
        personalEmail: "  ",
      }).success,
      true,
    );
  });

  it("still rejects a domain swapped into the wrong field", () => {
    assert.equal(
      memberEmailsSchema.safeParse({
        universityEmail: "nom@example.com",
        personalEmail: "nom@udl.cat",
      }).success,
      false,
    );
  });

  it("normalises and classifies the form's single address", () => {
    assert.deepEqual(toMemberEmails(" NOM@ALUMNES.UDL.CAT "), {
      universityEmail: "nom@alumnes.udl.cat",
    });
    assert.deepEqual(toMemberEmails(" NOM@EXAMPLE.COM "), {
      personalEmail: "nom@example.com",
    });
  });

  it("validates a single address without requiring its kind", () => {
    assert.equal(memberEmailSchema.safeParse("nom@udl.cat").success, true);
    assert.equal(memberEmailSchema.safeParse("nom@example.com").success, true);
    assert.equal(memberEmailSchema.safeParse("not-an-email").success, false);
  });
});
