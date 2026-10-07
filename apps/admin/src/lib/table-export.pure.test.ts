import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { LIST_EXPORT_MAX_ROWS } from "@repo/constants/validators/admin-list";

import { ApiRequestError } from "./api-error";
import {
  attachmentFilename,
  exportErrorMessage,
  exportFallbackFilename,
} from "./table-export.pure";

describe("attachment filename", () => {
  it("reads the quoted name the API sends", () => {
    assert.equal(
      attachmentFilename(
        'attachment; filename="registrations-curs-2026-2027-2026-10-07.csv"',
        "registrations.csv",
      ),
      "registrations-curs-2026-2027-2026-10-07.csv",
    );
  });

  it("accepts a bare token", () => {
    assert.equal(
      attachmentFilename("attachment; filename=members.csv", "x.csv"),
      "members.csv",
    );
  });

  it("falls back when the header is missing or names nothing", () => {
    assert.equal(attachmentFilename(null, "members.csv"), "members.csv");
    assert.equal(
      attachmentFilename("attachment", "members.csv"),
      "members.csv",
    );
  });

  it("names the fallback after the list", () => {
    assert.equal(
      exportFallbackFilename("/v1/admin/invitations/export"),
      "invitations.csv",
    );
  });
});

describe("export error message", () => {
  it("tells someone to narrow the list when it is too big to export", () => {
    const message = exportErrorMessage(
      new ApiRequestError("l'estat ha canviat mentrestant", 409, "CONFLICT"),
    );
    assert.ok(message.includes(LIST_EXPORT_MAX_ROWS.toLocaleString("ca")));
    assert.ok(message.includes("filtres"));
  });

  it("keeps the usual copy for every other failure", () => {
    assert.equal(
      exportErrorMessage(
        new ApiRequestError("no tens permís per fer això", 403, "FORBIDDEN"),
      ),
      "no tens permís per fer això",
    );
  });
});
