import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { toCsv } from "./csv";

describe("toCsv", () => {
  it("quotes fields containing a comma, quote, or newline and doubles quotes", () => {
    const out = toCsv(
      ["a", "b", "c"],
      [
        ["plain", "has, comma", 'has "quote"'],
        ["line\nbreak", "", 3],
      ],
    );
    const lines = out.replace(/^\uFEFF/, "").split("\r\n");
    assert.equal(lines[0], "a,b,c");
    assert.equal(lines[1], 'plain,"has, comma","has ""quote"""');
    assert.equal(lines[2], '"line\nbreak",,3');
  });

  it("prepends a UTF-8 BOM and ends with CRLF", () => {
    const out = toCsv(["x"], [["é"]]);
    assert.ok(out.startsWith("﻿"));
    assert.ok(out.endsWith("\r\n"));
  });

  it("renders null and undefined as empty fields", () => {
    const out = toCsv(["a", "b"], [[null, undefined]]);
    assert.equal(out.replace(/^\uFEFF/, "").split("\r\n")[1], ",");
  });
});
