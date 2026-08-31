import { isAuthRole, type AuthRole } from "./index";

/**
 * Named capabilities the admin product checks for. Call sites ask about a
 * capability, never about a role — see the plan's "Permissions" section.
 * Refining who-can-do-what later is an edit to `byRole` (plus, for a new
 * capability, one entry here); no route handler or component changes.
 *
 * The `as const` union means a typo in a capability name is a compile
 * error at the call site, not a silent `false` that quietly opens a route.
 */
export const capabilities = [
  "admin.access", // may load the admin app at all
  "registrations.review", // accept / reject / restore
  "campaigns.write", // create and edit drafts
  "campaigns.rollover", // open, close, make-current, archive
  "members.read",
  "members.status.write", // leave, kick, restore ("donar de baixa" — keeps history)
  "members.role.write", // promote / demote
  "members.delete", // irreversibly erase a user and every row about them
  "invitations.write", // invite a member
  "invitations.grant_admin", // invite someone as admin
  "sheets.sync",
] as const;

export type Capability = (typeof capabilities)[number];

/**
 * v1: `admin` holds every capability, `member` holds none. The distinct
 * `members.role.write` / `invitations.grant_admin` / `members.delete`
 * entries already exist so a later refinement (e.g. a "board" tier that may
 * invite members and end memberships but never erase a user) is a one-line
 * change here. `members.delete` is intentionally the most dangerous grant —
 * an irreversible erasure, not the reversible "donar de baixa" — so any
 * narrower role added later must not receive it by default.
 */
const byRole: Record<AuthRole, readonly Capability[]> = {
  member: [],
  admin: capabilities,
};

type SessionLike =
  { user?: { role?: string | null } | null } | null | undefined;

/**
 * Whether `session`'s user may exercise `capability`. Unknown / missing /
 * unrecognised roles get `false`. A future per-user grant table plugs in
 * here without touching any call site.
 */
export function can(session: SessionLike, capability: Capability): boolean {
  const role = session?.user?.role;
  if (!isAuthRole(role)) return false;
  return byRole[role].includes(capability);
}
