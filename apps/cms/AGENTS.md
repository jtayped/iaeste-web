# AGENTS.md — apps/cms

Self-hosted [Payload](https://payloadcms.com) CMS for the blog and for
student experiences. Next.js 16 + Payload 3.88. Owns article and experience
data, editor accounts, drafts, versions, localization and media metadata in
its **own** PostgreSQL database (`iaeste_cms`). The public marketing site
(`apps/web`, Next.js 15) reads published content through the narrow endpoints
under `src/app/api/public/blog/*` and `src/app/api/public/experiences/*` and
never touches Payload's generated REST shape.

## Commands

Run from the repo root; scope with `--workspace cms`.

```sh
npm run --workspace cms dev                # payload admin + APIs on :3006
npm run --workspace cms build              # next build (via withPayload)
npm run --workspace cms test               # node:test via tsx, src/**/*.test.ts
npm run --workspace cms generate:types     # rewrites src/payload-types.ts
npm run --workspace cms generate:importmap # rewrites src/app/(payload)/admin/importMap.js
npm run --workspace cms migrate:create     # new migration in src/migrations
npm run --workspace cms migrate            # apply pending migrations
```

## Generated files — never hand-edit

- `src/payload-types.ts` — from `generate:types`
- `src/app/(payload)/admin/importMap.js` — from `generate:importmap`
- `src/app/(payload)/**` route/layout files — Payload templates
- `src/migrations/*` — from `migrate:create`

CI regenerates types and the import map and fails if the committed copies
drift. Change the collection config, regenerate, commit both together.

## Rules

- **Configuration goes through `@repo/env/cms/server`.** It is the only module
  that reads `process.env`; ESLint's boundary rule fails the build otherwise.
  Add every key to `.env.example` and `turbo.json` `globalEnv`.
- **Access rules run on the server.** `src/access/roles.ts` is the source of
  truth. Hiding a field or button in the admin UI is not authorization —
  every rule must hold for direct REST, GraphQL and Local API calls.
  `administrator` manages everything; `editor` writes posts, experiences,
  tags and media but cannot manage users or permanently delete posts or
  experiences.
- **Payload owns `iaeste_cms` exclusively.** Never point it at the API's
  `DATABASE_URL`. `@repo/db`'s Drizzle files own the application database;
  neither migrator inspects the other's schema.
- **Development** may use Payload's schema push against a throwaway local
  `iaeste_cms_dev`. **Production** runs committed migrations from
  `src/migrations` via `docker-entrypoint.sh` before the server goes ready.
- **Rich text** is limited to the features in `src/lib/lexical.ts` (paragraphs,
  h2–h4, bold, italic, lists, links, blockquotes, uploaded images, rules). No
  raw HTML, no arbitrary embeds, no custom blocks. The public renderer in
  `apps/web` maps exactly this set.
- **The admin panel stays native.** Brand it (logo, navy, lowercase copy) but
  do not redesign it. The only bespoke component is the per-locale
  completeness panel on the article edit view.
- **Lowercase interface copy.** The admin language is Catalan only; add
  targeted translation overrides in `payload.config.ts` wherever an upstream
  string starts with an uppercase letter.

## Content types

Both `posts` and `experiences` are drafted, versioned and localized
(`ca` default and fallback). Publishing is strict, drafts are not:
`requireCatalanToPublish` in `src/hooks/validate-document.ts` refuses a
publish until the Catalan locale has every required field, whichever locale
the editor is in. Slugs come from `localizedSlugField()` and lock at first
publication.

- **posts** need title, slug, excerpt, body and cover image in Catalan.
- **experiences** are first-person stories from UdL students who did a
  placement abroad. They need title, slug, quote, body, photo, student name
  and country, and the `consent` box ticked: the CMS refuses to publish a
  story without the person's written permission. `country` is an ISO
  3166-1 alpha-2 code; the site prints the name with `Intl.DisplayNames`.
  `featured` puts a story on the student page.

Each type has the same four routes, with its contract in
`@repo/constants/validators/blog` or `@repo/constants/validators/experiences`:

| Route                            | What it returns                                        |
| -------------------------------- | ------------------------------------------------------ |
| `GET /api/public/<type>`         | published summaries, newest first, paginated           |
| `GET /api/public/<type>/:slug`   | one document by slug, then by its Catalan slug, or 404 |
| `GET /api/public/<type>/sitemap` | complete locales of every published document           |
| `GET /api/preview/<type>/:id`    | the latest draft; 404 without `x-preview-secret`       |

`<type>` is `blog` or `experiences`. `GET /api/public/experiences` also takes
`?featured=true`.

After a visible change the CMS POSTs an HMAC-signed body to
`WEB_REVALIDATE_URL` with `collection` (`posts` or `experiences`),
`documentId`, `slugs` and `reason`. Preview links are signed over the
collection, id, locale and expiry (`src/lib/signed-preview.ts`); the site keeps
a copy of the verifier in `apps/web/src/lib/preview-token.ts` on the same wire
format.

## Upstream constraints (confirm against installed versions)

- `payload` and every `@payloadcms/*` package pin the exact same version.
- `@payloadcms/richtext-lexical` requires React ≥ 19.1.2 — the monorepo is on
  19.2.0.
- `@payloadcms/next` supports Next `>=16.2.6 <17` (and a few 15.2/15.3/15.4
  ranges) — **not** the repo's 15.5.x, which is why this app pins Next 16.
- Media bytes need a real filesystem or object-storage adapter; Postgres only
  holds the metadata.
