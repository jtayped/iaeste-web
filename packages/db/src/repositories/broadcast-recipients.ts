import type { Database } from "../client";
import { createInvitationRepository, type InvitationSelection } from "./invitations";
import { createMemberRepository, type MemberSelection } from "./members";
import {
  createRegistrationRepository,
  type RegistrationProfileSnapshot,
  type RegistrationSelection,
} from "./registrations";

/**
 * Who a broadcast is going to, expressed as "this table, these filters, this
 * selection". One descriptor for every list in the admin product, so the
 * composer is a standard table action rather than three near-identical
 * features that drift apart.
 *
 * `kind` names the table the operator was looking at, because that is what
 * they can reason about — "the eleven people I ticked on sol·licituds" — not
 * some derived audience they never saw.
 */
export type BroadcastAudience =
  | { kind: "registrations"; selection: RegistrationSelection }
  | { kind: "members"; selection: MemberSelection }
  | { kind: "invitations"; selection: InvitationSelection };

export interface BroadcastRecipientRow {
  /** The row the address came from, so the UI can link back to the record. */
  rowId: string;
  email: string;
  name: string;
  surnames: string;
}

/**
 * De-duplicates by address, keeping the first occurrence.
 *
 * One person can hold two rows a selection reaches — a registration and a
 * membership, an invitation and the registration it produced. Sending them
 * the same message twice is the kind of small, visible sloppiness a committee
 * gets judged on, so the address is the identity here, not the row.
 */
function dedupeByEmail(
  rows: readonly BroadcastRecipientRow[],
): BroadcastRecipientRow[] {
  const seen = new Set<string>();
  const unique: BroadcastRecipientRow[] = [];
  for (const row of rows) {
    const email = row.email.trim().toLowerCase();
    if (!email || seen.has(email)) continue;
    seen.add(email);
    unique.push({ ...row, email });
  }
  return unique;
}

export function createBroadcastRecipientRepository(db: Database) {
  return {
    /**
     * Resolves an audience to the addresses it names, de-duplicated and
     * capped at `limit`.
     *
     * Callers pass their ceiling plus one and refuse a result that reaches
     * `limit`, so "too many recipients" costs one extra row rather than a
     * load of the whole table. The cap is applied before de-duplication, so
     * the refusal is about how much work was asked for, not about how much
     * survived it.
     */
    async resolve(
      audience: BroadcastAudience,
      limit: number,
    ): Promise<BroadcastRecipientRow[]> {
      switch (audience.kind) {
        case "registrations": {
          const rows = await createRegistrationRepository(db).resolveSelection(
            audience.selection,
            limit,
          );
          return dedupeByEmail(
            rows.map((row) => {
              const snapshot =
                row.profileSnapshot as RegistrationProfileSnapshot;
              return {
                rowId: row.id,
                // The personal address is the one an applicant actually
                // reads; `email` is whichever they proved at sign-up and is
                // often the university account they check once a term.
                email: row.personalEmail ?? row.email,
                name: snapshot.name,
                surnames: snapshot.surnames,
              };
            }),
          );
        }

        case "members": {
          const rows = await createMemberRepository(
            db,
          ).listBroadcastSelection(audience.selection, limit);
          return dedupeByEmail(
            rows.map((row) => ({
              rowId: row.userId,
              email: row.email,
              name: row.name,
              surnames: row.surnames,
            })),
          );
        }

        case "invitations": {
          const rows = await createInvitationRepository(db).resolveSelection(
            audience.selection,
            limit,
          );
          return dedupeByEmail(
            rows.map((row) => ({
              rowId: row.id,
              email: row.email,
              // An invitation may carry no prefill at all; the templates fall
              // back to something addressable rather than "hola ,".
              name: row.prefillName ?? "",
              surnames: row.prefillSurnames ?? "",
            })),
          );
        }
      }
    },
  };
}
