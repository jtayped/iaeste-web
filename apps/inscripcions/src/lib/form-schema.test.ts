import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  codeStepSchema,
  emailStepSchema,
  profileFormSchema,
} from "./form-schema";

const validProfile = {
  name: "Joan",
  surnames: "Garcia Serra",
  phone: "+34 623 32 42 34",
  degree: "grau en informàtica (lleida)",
  year: 2,
  note: "",
};

describe("profileFormSchema", () => {
  it("accepts a complete profile", () => {
    assert.equal(profileFormSchema.safeParse(validProfile).success, true);
  });

  it("has no email field at all — the address is proven, never typed here", () => {
    const parsed = profileFormSchema.parse({
      ...validProfile,
      email: "joan@alumnes.udl.cat",
    });

    assert.equal("email" in parsed, false);
  });

  it("uses the shared phone validation rule", () => {
    const result = profileFormSchema.safeParse({
      ...validProfile,
      phone: "+34 000 00 00 00",
    });

    assert.equal(result.success, false);
    assert.equal(
      result.error?.issues.find((issue) => issue.path[0] === "phone")?.message,
      "el número de telèfon no és vàlid",
    );
  });
});

describe("emailStepSchema", () => {
  it("normalises the address before it is sent", () => {
    const result = emailStepSchema.safeParse({
      email: " JOAN@ALUMNES.UDL.CAT ",
    });

    assert.equal(result.success, true);
    assert.equal(result.data?.email, "joan@alumnes.udl.cat");
  });

  it("rejects anything that is not an address", () => {
    assert.equal(emailStepSchema.safeParse({ email: "nope" }).success, false);
    assert.equal(emailStepSchema.safeParse({ email: "" }).success, false);
  });
});

describe("codeStepSchema", () => {
  it("accepts exactly six digits", () => {
    assert.equal(codeStepSchema.safeParse({ code: "418502" }).success, true);
  });

  it("rejects a partial or non-numeric code", () => {
    for (const code of ["41850", "4185021", "41850a", ""]) {
      assert.equal(codeStepSchema.safeParse({ code }).success, false);
    }
  });
});
