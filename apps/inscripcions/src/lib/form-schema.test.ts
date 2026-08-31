import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  AT_LEAST_ONE_EMAIL_MESSAGE,
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
});

describe("emailStepSchema", () => {
  it("normalises both addresses before they are sent", () => {
    const result = emailStepSchema.safeParse({
      universityEmail: " JOAN@ALUMNES.UDL.CAT ",
      personalEmail: " JOAN@EXAMPLE.COM ",
    });

    assert.equal(result.success, true);
    assert.equal(result.data?.universityEmail, "joan@alumnes.udl.cat");
    assert.equal(result.data?.personalEmail, "joan@example.com");
  });

  it("rejects anything that is not an address", () => {
    assert.equal(
      emailStepSchema.safeParse({
        universityEmail: "nope",
        personalEmail: "joan@example.com",
      }).success,
      false,
    );
  });

  it("accepts a university address on its own", () => {
    const result = emailStepSchema.safeParse({
      universityEmail: "joan@alumnes.udl.cat",
      personalEmail: "",
    });

    assert.equal(result.success, true);
    assert.equal(result.data?.universityEmail, "joan@alumnes.udl.cat");
    assert.equal(result.data?.personalEmail, undefined);
  });

  it("accepts a personal address on its own", () => {
    const result = emailStepSchema.safeParse({
      universityEmail: "",
      personalEmail: "joan@example.com",
    });

    assert.equal(result.success, true);
    assert.equal(result.data?.universityEmail, undefined);
    assert.equal(result.data?.personalEmail, "joan@example.com");
  });

  it("rejects neither address, which is the one combination there is no form for", () => {
    const result = emailStepSchema.safeParse({
      universityEmail: "",
      personalEmail: "   ",
    });

    assert.equal(result.success, false);
  });
});

describe("emailStepFormSchema", () => {
  const both = {
    universityEmail: "joan@alumnes.udl.cat",
    personalEmail: "joan@example.com",
  };

  it("keeps the inputs as strings, so the two fields stay bindable", () => {
    const result = emailStepFormSchema.safeParse({
      universityEmail: "joan@alumnes.udl.cat",
      personalEmail: "",
    });

    assert.equal(result.success, true);
    assert.deepEqual(result.data, {
      universityEmail: "joan@alumnes.udl.cat",
      personalEmail: "",
    });
  });

  it("delegates every rule to the shared schema, paths included", () => {
    const result = emailStepFormSchema.safeParse({
      ...both,
      universityEmail: "joan@example.com",
    });

    assert.equal(result.success, false);
    assert.equal(
      result.error?.issues.find((issue) => issue.path[0] === "universityEmail")
        ?.message,
      "fes servir el correu @udl.cat o @alumnes.udl.cat",
    );
  });

  it("reports the empty pair with the message the form shows above both fields", () => {
    const result = emailStepFormSchema.safeParse({
      universityEmail: "",
      personalEmail: "",
    });

    assert.equal(result.success, false);
    assert.equal(
      result.error?.issues.some(
        (issue) => issue.message === AT_LEAST_ONE_EMAIL_MESSAGE,
      ),
      true,
    );
  });
});
