import type { MemberExportRow } from "@repo/db/repositories";

import { toCsv } from "./csv";

/**
 * The members CSV for one campaign. Catalan column headers (this file is
 * opened by the committee, not by code); ISO dates so a re-import or a script
 * can parse them unambiguously.
 */
const HEADERS = [
  "nom",
  "cognoms",
  "correu",
  "telèfon",
  "estudis",
  "curs",
  "rol",
  "estat",
  "origen",
  "alta",
  "baixa",
  "motiu de baixa",
] as const;

const iso = (value: Date | null): string => (value ? value.toISOString() : "");

export function membersCsv(rows: readonly MemberExportRow[]): string {
  return toCsv(
    HEADERS,
    rows.map((row) => [
      row.name,
      row.surnames,
      row.email,
      row.phone,
      row.degree,
      row.studyYear ?? "",
      row.role ?? "member",
      row.status,
      row.source,
      iso(row.joinedAt),
      iso(row.endedAt),
      row.endedReason ?? "",
    ]),
  );
}

/** `membres-<slug>.csv`, ASCII-safe for the Content-Disposition header. */
export function membersCsvFilename(slug: string): string {
  const safe = slug.replace(/[^a-z0-9-]+/gi, "-").replace(/^-+|-+$/g, "");
  return `membres-${safe || "campanya"}.csv`;
}
