# Blog content

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
2. `.github/workflows/deploy.yml` builds and pushes a new `apps/web` image to
   GHCR. Its path filter explicitly includes both content and the Keystatic
   config.
3. Once the Coolify resource described in [deployment.md](./deployment.md) is
   connected to the image update, it pulls and redeploys that image. The blog
   files and their images are baked into it, so publishing is not live until
   this rebuild completes.

Only `apps/web` is containerised today, so a content commit cannot rebuild the
wrong deployable. When `inscripcions`, admin and API images are added, preserve
the explicit web content/config paths while splitting deploy jobs by image.
