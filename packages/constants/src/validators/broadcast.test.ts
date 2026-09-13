import assert from "node:assert/strict";
import { test } from "node:test";

import {
  applyPlaceholders,
  broadcastContentSchema,
  personaliseBroadcast,
  unknownPlaceholders,
} from "./broadcast";

const recipient = {
  email: "anna.puig@udl.cat",
  name: "Anna",
  surnames: "Puig Serra",
};

test("substitutes every known placeholder", () => {
  assert.equal(
    applyPlaceholders("hola {{nom}} {{cognoms}} ({{correu}})", recipient),
    "hola Anna Puig Serra (anna.puig@udl.cat)",
  );
});

test("tolerates whitespace inside the braces", () => {
  assert.equal(applyPlaceholders("hola {{ nom }}", recipient), "hola Anna");
});

test("leaves an unknown placeholder visible rather than blanking it", () => {
  assert.equal(applyPlaceholders("hola {{name}}", recipient), "hola {{name}}");
});

test("reports unknown placeholders once each, known ones never", () => {
  assert.deepEqual(
    unknownPlaceholders("{{nom}} {{name}} {{name}} {{surname}}"),
    ["name", "surname"],
  );
});

test("rejects content using a placeholder that does not exist", () => {
  const result = broadcastContentSchema.safeParse({
    subject: "assemblea",
    body: "hola {{name}}",
  });
  assert.equal(result.success, false);
  assert.match(result.error!.issues[0]!.message, /\{\{name\}\}/);
});

test("accepts content using only known placeholders", () => {
  const result = broadcastContentSchema.safeParse({
    subject: "assemblea, {{nom}}",
    body: "ens veiem dimarts.",
  });
  assert.equal(result.success, true);
});

test("refuses a call-to-action href that is not https", () => {
  const result = broadcastContentSchema.safeParse({
    subject: "assemblea",
    body: "ens veiem dimarts.",
    callToAction: { label: "apunta-t'hi", href: "javascript:alert(1)" },
  });
  assert.equal(result.success, false);
});

test("personalises every field of a broadcast at once", () => {
  const personalised = personaliseBroadcast(
    {
      subject: "{{nom}}, ens veiem dimarts",
      heading: "hola {{nom}}",
      body: "escrivim a {{correu}}.",
      callToAction: { label: "vine, {{nom}}", href: "https://example.com" },
    },
    recipient,
  );

  assert.deepEqual(personalised, {
    subject: "Anna, ens veiem dimarts",
    heading: "hola Anna",
    body: "escrivim a anna.puig@udl.cat.",
    callToAction: { label: "vine, Anna", href: "https://example.com" },
  });
});
