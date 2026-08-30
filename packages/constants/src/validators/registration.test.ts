import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { registrationSchema } from "./registration";

const validRegistration = {
  name: "Joan",
  surnames: "Garcia Serra",
  email: "joan@alumnes.udl.cat",
  phone: "+34 623 32 42 34",
  degree: "grau en informàtica (lleida)",
  year: 2,
};

describe("registrationSchema", () => {
  it("accepts a valid international phone number", () => {
    assert.equal(registrationSchema.safeParse(validRegistration).success, true);
  });

  it("rejects a number that libphonenumber considers invalid", () => {
    const result = registrationSchema.safeParse({
      ...validRegistration,
      phone: "+34 000 00 00 00",
    });

    assert.equal(result.success, false);
    assert.equal(
      result.error?.issues.find((issue) => issue.path[0] === "phone")?.message,
      "el número de telèfon no és vàlid",
    );
  });
});
