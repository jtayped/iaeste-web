import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { registrationFormSchema, toRegistration } from "./form-schema";

const validForm = {
  name: "Joan",
  surnames: "Garcia Serra",
  email: "joan@alumnes.udl.cat",
  confirmEmail: "joan@alumnes.udl.cat",
  phone: "+34 623 32 42 34",
  degree: "Grau en Informàtica (Lleida)",
  year: 2,
  note: "",
};

describe("registrationFormSchema", () => {
  it("accepts and normalises a complete form", () => {
    const result = registrationFormSchema.safeParse({
      ...validForm,
      email: " JOAN@ALUMNES.UDL.CAT ",
      confirmEmail: "joan@alumnes.udl.cat",
    });

    assert.equal(result.success, true);
    assert.equal(result.data?.email, "joan@alumnes.udl.cat");
  });

  it("reports mismatched email confirmation on the confirmation field", () => {
    const result = registrationFormSchema.safeParse({
      ...validForm,
      confirmEmail: "altra@alumnes.udl.cat",
    });

    assert.equal(result.success, false);
    assert.deepEqual(result.error?.issues[0]?.path, ["confirmEmail"]);
    assert.equal(
      result.error?.issues[0]?.message,
      "els dos correus no coincideixen",
    );
  });

  it("uses the shared phone validation rule", () => {
    const result = registrationFormSchema.safeParse({
      ...validForm,
      phone: "+34 000 00 00 00",
    });

    assert.equal(result.success, false);
    assert.equal(
      result.error?.issues.find((issue) => issue.path[0] === "phone")?.message,
      "el número de telèfon no és vàlid",
    );
  });
});

describe("toRegistration", () => {
  it("drops client-only confirmation and an empty optional note", () => {
    const parsed = registrationFormSchema.parse(validForm);

    assert.deepEqual(toRegistration(parsed), {
      name: "Joan",
      surnames: "Garcia Serra",
      email: "joan@alumnes.udl.cat",
      phone: "+34 623 32 42 34",
      degree: "Grau en Informàtica (Lleida)",
      year: 2,
    });
  });
});
