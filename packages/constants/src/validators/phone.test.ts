import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isValidPhone, parsePhone } from "./phone";

describe("parsePhone", () => {
  it("assumes Spain for a national number", () => {
    assert.deepEqual(parsePhone("623 32 42 34"), {
      e164: "+34623324234",
      display: "+34 623 32 42 34",
    });
  });

  it("preserves the country of an international number", () => {
    assert.deepEqual(parsePhone("+44 20 7946 0958"), {
      e164: "+442079460958",
      display: "+44 20 7946 0958",
    });
  });

  it("rejects malformed and impossible numbers", () => {
    for (const value of ["", "not a phone", "123", "+34 000 00 00 00"]) {
      assert.equal(parsePhone(value), undefined);
      assert.equal(isValidPhone(value), false);
    }
  });
});
