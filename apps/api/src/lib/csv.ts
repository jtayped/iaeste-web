/**
 * Minimal RFC 4180 CSV serialiser. No dependency, no streaming — the admin
 * exports are at most a few hundred rows.
 *
 * A field is quoted when it contains a comma, a quote, or a newline; embedded
 * quotes are doubled. Rows are joined with CRLF, which is what spreadsheet
 * apps expect. A leading U+FEFF byte-order mark is prepended so Excel opens
 * the file as UTF-8 (accented Catalan names) instead of the local ANSI page.
 */
const BOM = "﻿";

export function toCsv(
  headers: readonly string[],
  rows: readonly (readonly (string | number | null | undefined)[])[],
): string {
  const encodeField = (value: string | number | null | undefined): string => {
    const text = value === null || value === undefined ? "" : String(value);
    if (/[",\r\n]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  };

  const lines = [headers, ...rows].map((row) => row.map(encodeField).join(","));
  return `${BOM}${lines.join("\r\n")}\r\n`;
}
