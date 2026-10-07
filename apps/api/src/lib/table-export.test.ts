import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Hono } from "hono";
import { requestId } from "hono/request-id";

import {
  exportFilename,
  sendTableExport,
  tableCsv,
  type ExportColumn,
} from "./table-export";

interface Row {
  name: string;
  at: Date | null;
  active: boolean;
  count: number;
}

const COLUMNS: ExportColumn<Row>[] = [
  { header: "nom", value: (row) => row.name },
  { header: "data", value: (row) => row.at },
  { header: "actiu", value: (row) => row.active },
  { header: "nombre", value: (row) => row.count },
];

function lines(csv: string): string[] {
  return csv
    .replace(/^\uFEFF/, "")
    .trimEnd()
    .split("\r\n");
}

describe("tableCsv", () => {
  it("writes dates in Madrid time, booleans as sí/no and null as empty", () => {
    const csv = tableCsv(COLUMNS, [
      // 22:30 UTC is 00:30 the next day in Madrid (CEST, UTC+2).
      {
        name: "Anna",
        at: new Date("2026-10-07T22:30:00Z"),
        active: true,
        count: 3,
      },
      { name: "Pau", at: null, active: false, count: 0 },
    ]);
    assert.deepEqual(lines(csv), [
      "nom,data,actiu,nombre",
      "Anna,2026-10-08 00:30,sí,3",
      "Pau,,no,0",
    ]);
  });

  it("makes a text cell that would start a formula read as text", () => {
    const csv = tableCsv(COLUMNS, [
      { name: '=HYPERLINK("x")', at: null, active: true, count: -1 },
      { name: "+34 623 32 42 34", at: null, active: true, count: 0 },
      { name: "@SUM(A1)", at: null, active: true, count: 0 },
    ]);
    // `-1` is a number, not text a person typed, so it stays as it is.
    assert.deepEqual(lines(csv).slice(1), [
      `"'=HYPERLINK(""x"")",,sí,-1`,
      "'+34 623 32 42 34,,sí,0",
      "'@SUM(A1),,sí,0",
    ]);
  });
});

describe("exportFilename", () => {
  const now = new Date("2026-10-07T10:00:00Z");

  it("joins the table, the campaign slug and the Madrid date", () => {
    assert.equal(
      exportFilename("membres", { slug: "2026-2027", now }),
      "membres-2026-2027-2026-10-07.csv",
    );
  });

  it("leaves the slug out when there is none", () => {
    assert.equal(
      exportFilename("campanyes", { now }),
      "campanyes-2026-10-07.csv",
    );
  });

  it("reduces anything outside [a-z0-9-] to single dashes", () => {
    assert.equal(
      exportFilename("membres", { slug: "curs 2026/27 «nou»", now }),
      "membres-curs-2026-27-nou-2026-10-07.csv",
    );
  });
});

describe("sendTableExport", () => {
  function app(total: number, maxRows: number) {
    const rows: Row[] = Array.from(
      { length: Math.min(total, maxRows) },
      (_, i) => ({
        name: `fila ${i}`,
        at: null,
        active: true,
        count: i,
      }),
    );
    const windows: { limit: number; offset: number }[] = [];
    const hono = new Hono();
    hono.use("*", requestId());
    hono.get("/export", (c) =>
      sendTableExport(c, {
        filename: "prova-2026-10-07.csv",
        columns: COLUMNS,
        maxRows,
        load: async (window) => {
          windows.push(window);
          return { rows, total };
        },
      }),
    );
    return { hono, windows };
  }

  it("asks for one window from zero, as wide as the cap", async () => {
    const { hono, windows } = app(3, 5);
    await hono.request("/export");
    assert.deepEqual(windows, [{ limit: 5, offset: 0 }]);
  });

  it("answers with a CSV attachment holding every row", async () => {
    const res = await app(3, 5).hono.request("/export");
    assert.equal(res.status, 200);
    assert.match(res.headers.get("content-type") ?? "", /^text\/csv/);
    assert.equal(
      res.headers.get("content-disposition"),
      'attachment; filename="prova-2026-10-07.csv"',
    );
    assert.equal(lines(await res.text()).length, 4);
  });

  it("refuses with a 409 when more rows match than the cap", async () => {
    const res = await app(6, 5).hono.request("/export");
    assert.equal(res.status, 409);
    const body = (await res.json()) as {
      error: { code: string; message: string };
    };
    assert.equal(body.error.code, "CONFLICT");
    assert.match(body.error.message, /at most 5 rows and 6 match/);
  });
});
