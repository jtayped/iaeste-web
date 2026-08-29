# Blog content

The blog is served from **`apps/cms`**, a self-hosted [Payload](https://payloadcms.com)
CMS at `cms.iaestelleida.cat`. It is a separate product with its own accounts
(no GitHub, no committee-admin SSO in v1), its own PostgreSQL database
(`iaeste_cms`) and its own media volume. The public site (`apps/web`) reads
published articles through the narrow endpoints under
`apps/cms/src/app/api/public/blog/*`.

Reach it from the admin sidebar's **continguts** link or directly at
`https://cms.iaestelleida.cat/admin`.

## Accounts

The first administrator is created through Payload's initial-user screen on the
private hostname; that route closes once an account exists. Administrators then
create `editor` accounts from the _usuaris_ collection and test password-reset
delivery before inviting the team. Editors write, publish and unpublish
articles but cannot manage users or permanently delete posts. `src/access/roles.ts`
is the server-side source of truth — hiding a control in the admin UI is not
authorization.

## Writing an article

- **One document, three locales.** Each post carries Catalan, Spanish and
  English in one editing screen via the locale selector. Catalan is the default
  and the fallback. A translation counts as complete only when its title, slug,
  excerpt and body are all filled; incomplete Spanish/English fall back to
  Catalan on the public site with the usual notice and a Catalan canonical URL,
  and are kept out of the sitemap.
- **Slugs** are generated from the title, editable until first publication,
  then locked by a server hook. Duplicate localized slugs are rejected with a
  field error.
- **Drafts and preview.** Draft saves autosave and may be incomplete;
  publishing runs strict Catalan validation (title, excerpt, cover image with
  alt text, body). Use the **Preview** action to see the draft in the real
  public layout — it opens a signed link that expires after ten minutes and
  enables Draft Mode on the marketing site. A visible _surt de la
  previsualització_ action leaves preview.
- **Publishing** writes the published version, then pings the public site to
  invalidate its cache; the article normally appears within seconds and always
  within one minute, with no Git commit or redeploy. The admin says `publicat`
  only after the version is committed.
- **Media.** JPEG/PNG/WebP/AVIF only, 8 MB max, no paste-by-URL. Alternative
  text (Catalan) is required before an image can be used by a published
  article. A file cannot be deleted while a post still references it.
- **Rich text** is limited to paragraphs, headings h2–h4, bold, italic,
  ordered/unordered lists, links, blockquotes, uploaded images and horizontal
  rules. No raw HTML, embeds or custom blocks. The public renderer in `apps/web`
  (`src/components/blog/lexical-content.tsx`) maps exactly this set.

## Local development

1. Copy `.env.example` to `.env` and fill the `apps/cms` block: point
   `CMS_DATABASE_URL` at a throwaway local database (schema push handles the
   tables in development) and set the three shared secrets.
2. Run `npm run --workspace cms dev` and open `http://localhost:3006/admin`.
3. Create the first user, then write and publish an article. With
   `npm run --workspace web dev` also running, it appears at
   `http://localhost:3000/ca/blog`.

## Backups and recovery

The `iaeste_cms` database and the `/data/media` volume are one unit — restore
both from the same backup window. Configure daily backups of both, and run a
periodic restore drill: an article, its cover image and an older draft version
must all survive. See `docs/deployment.md`.
