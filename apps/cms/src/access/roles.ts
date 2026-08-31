import type { Access, FieldAccess } from "payload";

/**
 * Role model for the blog CMS. Two roles, checked on the server for every
 * REST, GraphQL and Local API call — hiding a control in the admin UI is not
 * authorization (see `apps/cms/AGENTS.md`).
 *
 *   administrator  full control of users, posts, tags and media
 *   editor         create / read / update / publish / unpublish posts;
 *                  create tags and media; cannot touch users; cannot
 *                  permanently delete posts
 */
export type Role = "administrator" | "editor";

/**
 * A CMS user as far as the access rules care. `req.user` is Payload's
 * `UntypedUser` until `payload-types.ts` is regenerated from the real schema;
 * `role` is optional here so both shapes assign cleanly.
 */
type MaybeUser =
  { id?: string | number; role?: Role | null } | null | undefined;

export const isAdmin = (user: MaybeUser): boolean =>
  user?.role === "administrator";

export const isEditor = (user: MaybeUser): boolean =>
  user?.role === "editor" || user?.role === "administrator";

/** Any authenticated CMS user. */
export const authenticated: Access = ({ req }) => Boolean(req.user);

/**
 * Readable by anyone. Used for `tags` (no draft concept) and as the base for
 * `media`/`posts`, which narrow it to published rows for non-editors below.
 * The narrow public API always calls the Local API with `overrideAccess`, so
 * this only governs the raw REST/GraphQL surface.
 */
export const publicRead: Access = () => true;

/** Published rows for the public; everything for editors and admins. */
export const publishedOrEditor: Access = ({ req }) => {
  if (isEditor(req.user)) return true;
  return { _status: { equals: "published" } };
};

/** Administrators only. */
export const adminOnly: Access = ({ req }) => isAdmin(req.user);

/** Editors and administrators. */
export const editorOrAdmin: Access = ({ req }) => isEditor(req.user);

/** Administrators only, as a field-level rule. */
export const adminOnlyField: FieldAccess = ({ req }) => isAdmin(req.user);

/**
 * Administrators, or the owner of this specific user record. Used so an editor
 * can read and update their own profile but nobody else's.
 */
export const adminOrSelf: Access = ({ req }) => {
  if (isAdmin(req.user)) return true;
  if (!req.user) return false;
  return { id: { equals: req.user.id } };
};
