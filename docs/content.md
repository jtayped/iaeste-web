# Blog content

> **Migration in progress.** The blog is moving to a self-hosted Payload CMS
> (`apps/cms`, `cms.iaestelleida.cat`). While `BLOG_SOURCE=keystatic` the
> Keystatic workflow below is still authoritative; once it flips to `payload`
> the CMS section is. Both are kept until the seven-day observation period
> ends.

## Payload CMS

A separate product with its own accounts (no GitHub, no committee-admin SSO in
v1). Reach it from the admin sidebar's **continguts** link or directly at
`https://cms.iaestelleida.cat/admin`.

- **Accounts.** The first administrator is created through Payload's
  initial-user screen on the private hostname; that route closes once an
  account exists. Administrators then create `editor` accounts from the
  _usuaris_ collection and test password-reset delivery before inviting the
  team. Editors write, publish and unpublish articles but cannot manage users
  or permanently delete posts.
- **One article, three locales.** Each post document carries Catalan, Spanish
  and English in one editing screen via the locale selector. Catalan is the
  default and fallback. A translation counts as complete only when its title,
  slug, excerpt and body are all filled; incomplete Spanish/English fall back
  to Catalan on the public site with the usual notice and a Catalan canonical
  URL, and are kept out of the sitemap. The read-only panel beside the editor
  shows each locale as `completa`, `incompleta` or `buida` and names the
  missing fields.
- **Slugs** are generated from the title, editable until first publication,
  then locked by a server hook. Duplicate localized slugs are rejected with a
  field error.
- **Drafts and preview.** Draft saves autosave and may be incomplete;
  publishing runs strict Catalan validation. Use the **Preview** action to see
  the draft in the real public layout — it opens a signed link that expires
  after ten minutes and enables Draft Mode on the marketing site. A visible
  _surt de la previsualització_ action leaves preview.
- **Publishing** writes the published version, then pings the public site to
  invalidate its cache; the article normally appears within seconds and always
  within one minute, with no Git commit or redeploy. The admin says
  `publicat` only after the version is committed.
- **Media.** JPEG/PNG/WebP/AVIF only, 8 MB max, no paste-by-URL. Alternative
  text (Catalan) is required before an image can be used by a published
  article. A file cannot be deleted while a post still references it.
- **Rich text** is limited to paragraphs, headings h2–h4, bold, italic,
  ordered/unordered lists, links, blockquotes, uploaded images and horizontal
  rules. No raw HTML, embeds or custom blocks.

Recovery: the `iaeste_cms` database and the `/data/media` volume are one unit
— restore both from the same backup window (see `docs/deployment.md`).

## Keystatic (until cutover)

The blog is part of `apps/web`; Keystatic is an editor for files in this
repository, not a separate service or database. Content lives in three locale
collections:

- `content/blog/ca/*`
- `content/blog/es/*`
- `content/blog/en/*`

Each version is an independent entry. Give translations the same
`translationKey` so the public article can link them and the sitemap can emit
the correct language alternates. A Catalan-only entry is shown as a clearly
labelled Catalan fallback under `/es` and `/en`; those fallback URLs are
non-indexable and are not added to the sitemap.

## Write and preview locally

1. Install dependencies and copy `.env.example` to `.env`. Keystatic uses
   local storage in development, so the four GitHub App values can stay blank.
2. Run `npm run --workspace web dev` and open
   `http://localhost:3000/keystatic`.
3. Choose the collection for the language being written. Fill in the title,
   publication date, author, excerpt, cover image, tags, translation key and
   Markdoc body. Keystatic derives the slug from the title; it can be edited
   before saving.
4. Leave **esborrany** enabled while working. Use the entry menu's **Preview**
   action to open the public route. Development shows drafts; production does
   not generate their routes.
5. Disable **esborrany**, save, review the files under `content/blog/<locale>`,
   then commit them. To translate a post, create a new entry in the other
   locale collection and reuse the original translation key.

Saving in local mode writes directly to the working tree. It does not commit or
push on the editor's behalf.

## Set up the GitHub App

Production uses Keystatic's GitHub storage mode for the repository
`jtayped/iaeste-web`. There is no GitHub App yet, so an owner must complete the
one-time setup before the deployed editor can be used:

1. Deploy the site with the production storage configuration, visit
   `/keystatic`, and follow Keystatic's GitHub App creation prompt. Create the
   app under the GitHub account or organisation that owns the repository and
   install it for `jtayped/iaeste-web`.
2. Copy the generated values into deployment configuration:
   `KEYSTATIC_GITHUB_CLIENT_ID`, `KEYSTATIC_GITHUB_CLIENT_SECRET` and
   `KEYSTATIC_SECRET` are server-only Coolify secrets.
   `NEXT_PUBLIC_KEYSTATIC_GITHUB_APP_SLUG` is a GitHub Actions repository
   variable because it must be present while the client bundle is built.
3. Rebuild and redeploy `apps/web`, then sign in through `/keystatic` and make
   a small editorial commit to confirm the App can write to the repository.

The [Keystatic GitHub mode guide](https://keystatic.com/docs/github-mode) is
the source of truth for App creation and environment values.

## Grant a new editor access

The App installation alone does not grant a person repository access. For each
new committee editor:

1. Invite their GitHub account to `jtayped/iaeste-web` with permission to write
   to the content branch used by Keystatic.
2. Confirm the Keystatic GitHub App installation includes this repository.
3. Ask them to open the deployed `/keystatic`, sign in with that GitHub account
   and verify they can open an entry and save a change.

Remove the collaborator when they leave the committee. Keep the App secrets in
Coolify/GitHub settings; never copy them into `.env.example`, a content file or
a commit.

## Publishing and deployment

A commit on `master` that changes `content/**` or `keystatic.config.ts` follows
the normal web delivery path:

1. `.github/workflows/ci.yml` runs formatting, lint, types, tests, environment
   drift checks and the production build.
2. `.github/workflows/deploy.yml` selects only `iaeste-web` for a change limited
   to `content/**` or `keystatic.config.ts`, then builds and pushes `main` plus
   an immutable commit-SHA tag to GHCR. The API and registration images do not
   rebuild for editorial commits.
3. The workflow calls the web resource's Coolify deploy webhook, waits for the
   deployment to finish, then checks the public health URL. The blog files and
   their images are baked into the image, so publishing is not live until this
   step passes.
