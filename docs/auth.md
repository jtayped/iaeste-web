# Authentication

Better Auth runs inside `apps/api` at `/api/auth/*`. `packages/auth` owns
the Better Auth configuration, shared session types, role helpers, and the
magic-link email callback. It is a library, not a deployable service.

## Sign-in flow

Only existing users can sign in. A registration acceptance or invitation
creates the user row; asking for a magic link never creates an account.
The request endpoint still returns a generic success response and sends a
link for an unknown address, but verification fails without creating a user.
This keeps the request endpoint from revealing which addresses have accounts.

Each member can have one verified university address and one verified personal
address in `user_email`. Either address resolves to the same Better Auth user.
`user.email` remains the canonical address required by Better Auth; the API
rewrites an alias sign-in request to that canonical identity while delivering
the link to the verified address the member actually entered. An unverified
address is never used for sign-in.

Magic links expire after ten minutes. The database stores a hash of each
token, not the token from the email. A successful verification creates an
opaque database session and returns its token in a host-only cookie with
`HttpOnly` and `SameSite=Lax`. Production cookies also have `Secure`.
These login links are separate from the seven-day links that only verify and
resume a public registration draft. A registration link never grants a member
session.

### Local development

Outside production (`runtime !== "production"`) the sign-in link is also
printed to the API server log, prefixed `[dev] magic-link sign-in for`, so
local sign-in works without a configured email transport. In dev a failing
email transport (for example a placeholder `RESEND_API_KEY`) is logged and
swallowed rather than failing the request — the logged URL is the link to
follow. Neither behaviour runs in production, where the email is the only
path and a send failure surfaces to the caller.

The two Better Auth roles are `member` and `admin`. They control access to
the admin product only. Annual membership remains in the IAESTE membership
tables. The organization plugin and admin impersonation routes are disabled.
Generic admin create-user, update-user, remove-user, and set-password routes
are also disabled. Registration acceptance and invitations own account
creation, email changes must revoke sessions, v1 has no password login, and
hard deletion remains a manual GDPR operation.

## Browser and proxy boundary

`ADMIN_PUBLIC_ORIGIN` is the stable browser-visible origin used in generated links.
Better Auth does not derive that origin from `Host` or `X-Forwarded-*`
headers, so a client cannot change a magic-link host through proxy headers.
Coolify and Traefik may terminate TLS in front of the API without changing
the generated HTTPS URL.

Auth requests use a separate `BETTER_AUTH_TRUSTED_ORIGINS` allowlist inside
Better Auth. The public `/v1/*` CORS allowlist remains separate because the
registration app does not use sessions.

`apps/admin` will rewrite its browser-visible `/api/auth/*` routes to this API.
The browser therefore sees only the admin origin and stores the host-only
cookie for that origin. The rewrite must forward `Cookie`, `Set-Cookie`, and
request IDs. Its implementation and server-side session enforcement belong
to IA-31; the admin app itself belongs to IA-50.

## Configuration

Set these values for `apps/api`:

| Variable                      | Purpose                                                   |
| ----------------------------- | --------------------------------------------------------- |
| `DATABASE_URL`                | Stores users, verification values, and sessions.          |
| `BETTER_AUTH_SECRET`          | Signs auth data. It must contain at least 32 characters.  |
| `BETTER_AUTH_TRUSTED_ORIGINS` | Comma-separated admin browser origins.                    |
| `ADMIN_PUBLIC_ORIGIN`         | Stable browser-visible auth origin, without a path.       |
| `NODE_ENV`                    | Enables non-secure cookies only outside production.       |
| `RESEND_API_KEY`              | Sends magic-link email through the shared Resend account. |
| `REGISTRATION_EMAIL_FROM`     | Sender address used by registration and auth email.       |

Generate the auth secret with `openssl rand -base64 32`. Never reuse a build
placeholder in a deployed environment. Production must set `NODE_ENV` to
`production`; `packages/auth` rejects an insecure-cookie configuration in
that runtime.

Local defaults expect the future admin app at `http://localhost:3005`, with
its rewrite targeting the API at `http://localhost:3004`. Plain HTTP local development uses a host-only,
non-secure cookie because browsers do not send `Secure` cookies over local
HTTP.

## Session revocation

`revokeAllUserSessions(auth, userId)` deletes every database session for a
user. Domain operations must call it when a kick, compromised invitation, or
email change lands. Better Auth's admin plugin already revokes all sessions
for its ban and admin-request endpoints. Revocation takes effect on the next
session lookup; there is no cookie cache that can keep a deleted session
alive.

IA-31 adds Hono authorization to the admin domain routes. Until then, the
existing registration-review routes remain unauthenticated and must not be
exposed through an admin UI.
