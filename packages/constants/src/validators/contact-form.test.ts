import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CONTACT_FORM_LIMITS,
  contactFormSchema,
  createContactFormSchema,
} from "./contact-form";

const valid = {
  email: "joan@example.com",
  name: "Joan",
  lastname: "Garcia",
  subject: "Hola",
  message: "Voldria mes informacio sobre els intercanvis.",
};

describe("contactFormSchema", () => {
  it("accepts a well-formed submission", () => {
    assert.equal(contactFormSchema.safeParse(valid).success, true);
  });

  it("trims surrounding whitespace", () => {
    const parsed = contactFormSchema.parse({ ...valid, name: "  Joan  " });

    assert.equal(parsed.name, "Joan");
  });

  it("rejects whitespace padded up to the minimum length", () => {
    const result = contactFormSchema.safeParse({ ...valid, name: " a " });

    assert.equal(result.success, false);
  });

  it("rejects an invalid email", () => {
    const result = contactFormSchema.safeParse({ ...valid, email: "nope" });

    assert.equal(result.success, false);
  });

  it("enforces the exported message limits", () => {
    const tooLong = "x".repeat(CONTACT_FORM_LIMITS.message.max + 1);
    const atLimit = "x".repeat(CONTACT_FORM_LIMITS.message.max);

    assert.equal(
      contactFormSchema.safeParse({ ...valid, message: tooLong }).success,
      false,
    );
    assert.equal(
      contactFormSchema.safeParse({ ...valid, message: atLimit }).success,
      true,
    );
  });

  it("uses the caller's messages so the UI can localise them", () => {
    const schema = createContactFormSchema(
      (key, values) => `${key}:${JSON.stringify(values ?? {})}`,
    );
    const result = schema.safeParse({ ...valid, name: "a" });

    assert.equal(result.success, false);
    assert.equal(result.error?.issues[0]?.message, 'name.min:{"min":2}');
  });
});
