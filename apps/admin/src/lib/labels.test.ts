import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { memberRowStatus, personName } from "./labels";

describe("person name", () => {
  it("cases what the public form was given", () => {
    assert.equal(personName("joel"), "Joel");
    assert.equal(personName("MARIA"), "Maria");
    assert.equal(personName("  anna   puig  "), "Anna Puig");
  });

  it("keeps particles inside a name lowercase", () => {
    assert.equal(personName("maria de los angeles"), "Maria de los Angeles");
    assert.equal(personName("puig i cadafalch"), "Puig i Cadafalch");
    assert.equal(personName("de la fuente"), "De la Fuente");
  });

  it("capitalises after a hyphen and an elision", () => {
    assert.equal(personName("anna-maria"), "Anna-Maria");
    assert.equal(personName("l'hospitalet"), "L'Hospitalet");
  });
});

describe("member row status", () => {
  it("answers the question the screen is asking", () => {
    assert.deepEqual(
      memberRowStatus({ currentStatus: "active", targetState: "eligible" }),
      { label: "per convidar", tone: "default" },
    );
  });

  it("falls back to the membership when no campaign is targeted", () => {
    assert.deepEqual(
      memberRowStatus({ currentStatus: "active", targetState: null }),
      { label: "activa", tone: "default" },
    );
    assert.deepEqual(
      memberRowStatus({ currentStatus: null, targetState: null }),
      { label: "sense alta", tone: "outline" },
    );
  });
});
