import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  codeStepSchema,
  emailStepFormSchema,
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

  it("normalises a Spanish phone number before submission", () => {
    const result = profileFormSchema.parse({
      ...validProfile,
      phone: "623324234",
    });

    assert.equal(result.phone, "+34 623 32 42 34");
  });
});

describe("codeStepSchema", () => {
  it("accepts exactly six digits", () => {
    assert.deepEqual(codeStepSchema.parse({ code: "418502" }), {
      code: "418502",
    });
    assert.equal(codeStepSchema.safeParse({ code: "41850" }).success, false);
    assert.equal(codeStepSchema.safeParse({ code: "41850a" }).success, false);
  });
});

describe("emailStepSchema", () => {
  it("normalises the address before it is classified", () => {
    const result = emailStepSchema.safeParse({
      email: " JOAN@ALUMNES.UDL.CAT ",
    });

    assert.equal(result.success, true);
    assert.equal(result.data?.email, "joan@alumnes.udl.cat");
  });

  it("rejects anything that is not an address", () => {
    assert.equal(emailStepSchema.safeParse({ email: "nope" }).success, false);
  });

  it("accepts university and personal addresses in the same field", () => {
    assert.equal(
      emailStepSchema.safeParse({ email: "joan@alumnes.udl.cat" }).success,
      true,
    );
    assert.equal(
      emailStepSchema.safeParse({ email: "joan@example.com" }).success,
      true,
    );
  });
});

describe("emailStepFormSchema", () => {
  it("keeps the input as a string so the field stays bindable", () => {
    const result = emailStepFormSchema.safeParse({
      email: "joan@alumnes.udl.cat",
    });

    assert.equal(result.success, true);
    assert.deepEqual(result.data, { email: "joan@alumnes.udl.cat" });
  });

  it("delegates validation to the shared schema, path included", () => {
    const result = emailStepFormSchema.safeParse({
      email: "not-an-email",
    });

    assert.equal(result.success, false);
    assert.equal(
      result.error?.issues.find((issue) => issue.path[0] === "email")?.message,
      "adreça de correu electrònic no vàlida",
    );
  });
});
