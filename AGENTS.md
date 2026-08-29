# AGENTS.md

Operational rules for coding agents in this repository. Read `PRODUCT.md` for
product and copy rules; this file covers structure and mechanics.

## Layout

| Path                  | What it is                                                                           |
| --------------------- | ------------------------------------------------------------------------------------ |
| `apps/web`            | Public marketing site. Next.js 15, `next-intl` (ca/es/en, ca default).               |
| `apps/inscripcions`   | Registration site. Next.js 15, Catalan only.                                         |
| `apps/api`            | Hono HTTP API. The only writer to Google Sheets.                                     |
| `apps/cms`            | Payload CMS for the blog. Next.js 16, own `iaeste_cms` DB. See `apps/cms/AGENTS.md`. |
| `packages/constants`  | Shared domain data and Zod schemas. No React, no I/O.                                |
| `packages/env`        | The only place that reads `process.env` in front-end code.                           |
| `packages/api-client` | Typed client **generated** from `apps/api/openapi.json`.                             |
| `packages/ui`         | Shared shadcn/Radix components. See `packages/ui/AGENTS.md`.                         |
| `packages/email`      | React Email templates and a Resend sender.                                           |
| `tooling/*`           | Shared ESLint, Tailwind, and TypeScript configs.                                     |

## Commands

Run these from the repo root; they fan out through Turborepo.

```sh
npm run check-types   # tsc --noEmit everywhere
npm run lint          # ESLint, warnings are errors
npm run test          # node:test via tsx
npm run format        # prettier --write
npm run generate:api  # regenerate openapi.json + the typed client
```

Scope to one workspace while iterating: `npm run --workspace @repo/constants test`.

`apps/cms` also has Payload commands — `generate:types`, `generate:importmap`,
`migrate:create`, `migrate`, `migrate:blog`. Its `payload-types.ts` and
`src/app/(payload)/admin/importMap.js` are generated; CI fails when they are
stale. See `apps/cms/AGENTS.md`.

## Where shared things live

Import these rather than redefining them. A duplicated type or schema is the
most common failure mode in this repo's history.

| Need                         | Import from                                                |
| ---------------------------- | ---------------------------------------------------------- |
| Registration shape and rules | `@repo/constants/validators/registration`                  |
| Contact form shape and rules | `@repo/constants/validators/contact-form`                  |
| Degree list / study types    | `@repo/constants/studies`, `@repo/constants/types/studies` |
| Registration site config     | `@repo/env/inscripcions`                                   |
| Marketing site config        | `@repo/env/web/client`, `@repo/env/web/server`             |
| Calling the API              | `@repo/api-client` (`createApiClient(baseUrl)`)            |
| UI primitives                | `@repo/ui/<component>`, e.g. `@repo/ui/button`             |
| Email sending                | `@repo/email/resend` (`createResendEmailer`)               |

## Rules

**Configuration goes through `@repo/env`.** Never read `process.env` in an app
or in `packages/ui`/`packages/email` — ESLint fails the build if you do. Add the
variable to the right schema in `packages/env/src`, to `.env.example`, and to
`globalEnv` in `turbo.json`. `apps/api` is the exception: it owns
`apps/api/src/config.ts`.

**Validation lives in `@repo/constants` and runs on the server.** A schema is
defined once and imported by both sides. Server actions and API routes
re-validate their input — the client schema is a convenience, not a boundary.
Localised messages are layered on by passing a translator into the schema
factory (see `createContactFormSchema`); never fork the shape to add messages.

**Writes go through `apps/api`.** The registration site talks to it via the
generated client. Do not add a second path to the spreadsheet.

**Never hand-edit `packages/api-client/src/generated/` or
`apps/api/openapi.json`.** Change the route schemas in `apps/api/src/`, then run
`npm run generate:api`. CI fails if the committed output is stale.

**Declare what you import.** Every package lists its own dependencies; the root
`package.json` holds tooling only. An import that resolves by hoisting will
break an isolated per-app deploy.

**Zod is v4 everywhere**, pinned by an `overrides` entry in the root
`package.json`.

**Errors surface.** Do not `catch` and `console.error` a failure that the user
is waiting on — return a typed result and render it. See
`apps/web/src/lib/emails.ts`.

## Before you finish

Run `npm run lint && npm run check-types && npm run test`. All three are CI
gates and all three are currently green — keep them that way.
