import type { Context } from "hono";

import { LIST_EXPORT_MAX_ROWS } from "@repo/constants/validators/admin-list";

import { errorBody } from "./api-error";
import { toCsv } from "./csv";

/**
 * Every admin list's CSV export goes through here.
 *
 * An export is the list itself without the page: the same search, filters and
 * ordering the table sent, answered by the same repository query the table
 * uses, with every matching row instead of one page of them. Reusing the list
 * query, rather than writing a second one per table, is what guarantees the
 * file holds exactly the rows the operator was looking at, in the same order.
 */

export type ExportCell = string | number | boolean | Date | null | undefined;

export interface ExportColumn<Row> {
  /** Catalan, lowercase: the file is read by the committee, not by code. */
  header: string;
  value: (row: Row) => ExportCell;
}

/** What a list's repository call answers when asked for one window of rows. */
export type ExportLoader<Row> = (window: {
  limit: number;
  offset: number;
}) => Promise<{ rows: readonly Row[]; total: number }>;

// `sv-SE` is the locale whose format is `2026-10-07 14:30`: sortable, and
// read as a date-time by every spreadsheet app. Madrid time because that is
// the clock the committee lives on — a UTC timestamp puts a 00:30
// registration on the previous day.
const DATE_TIME = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Madrid",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const DATE = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Madrid",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** The API's views carry instants as ISO strings; a column turns them back. */
export function instant(iso: string | null): Date | null {
  return iso === null ? null : new Date(iso);
}

/**
 * Spreadsheet apps run a cell that starts with one of these as a formula.
 * Names, notes and addresses come from the public registration form, so a
 * value like `=HYPERLINK(...)` would execute on a committee member's laptop.
 * A leading apostrophe makes Excel and Sheets read the cell as text and is
 * not displayed. It also keeps `+34 623 32 42 34` a phone number rather than
 * a formula that fails.
 */
const FORMULA_START = /^[=+\-@\t\r]/;

function formatCell(value: ExportCell): string | number | null | undefined {
  if (value instanceof Date) return DATE_TIME.format(value);
  if (typeof value === "boolean") return value ? "sí" : "no";
  if (typeof value === "string" && FORMULA_START.test(value)) {
    return `'${value}`;
  }
  return value;
}

export function tableCsv<Row>(
  columns: readonly ExportColumn<Row>[],
  rows: readonly Row[],
): string {
  return toCsv(
    columns.map((column) => column.header),
    rows.map((row) => columns.map((column) => formatCell(column.value(row)))),
  );
}

/**
 * `<table>[-<campaign slug>]-<YYYY-MM-DD>.csv`.
 *
 * ASCII only, because it goes inside a quoted `Content-Disposition` filename;
 * the date is the day of the export, so two downloads a week apart do not
 * overwrite each other in someone's Downloads folder.
 */
export function exportFilename(
  table: string,
  options: { slug?: string; now?: Date } = {},
): string {
  const parts = [table, options.slug, DATE.format(options.now ?? new Date())]
    .filter((part): part is string => Boolean(part))
    .map((part) => part.replace(/[^a-z0-9-]+/gi, "-").replace(/^-+|-+$/g, ""))
    .filter(Boolean);
  return `${parts.join("-")}.csv`;
}

/**
 * Answers an export request with the CSV, or a 409 when more rows match than
 * one file may hold.
 *
 * One query with the cap as its limit, not a loop over pages: pages read at
 * different moments can skip or repeat a row that changed between them, and
 * a file that silently lost someone is worse than a refusal.
 */
export async function sendTableExport<Row>(
  c: Context,
  options: {
    filename: string;
    columns: readonly ExportColumn<Row>[];
    load: ExportLoader<Row>;
    /** Only tests lower it; every route uses `LIST_EXPORT_MAX_ROWS`. */
    maxRows?: number;
  },
): Promise<Response> {
  const maxRows = options.maxRows ?? LIST_EXPORT_MAX_ROWS;
  const { rows, total } = await options.load({ limit: maxRows, offset: 0 });

  if (total > maxRows) {
    return c.json(
      errorBody(
        c.get("requestId"),
        "CONFLICT",
        `An export can hold at most ${maxRows} rows and ${total} match. Narrow the table filters and try again.`,
      ),
      409,
    );
  }

  c.header("Content-Type", "text/csv; charset=utf-8");
  c.header("Content-Disposition", `attachment; filename="${options.filename}"`);
  return c.body(tableCsv(options.columns, rows), 200);
}
