# Deployment

Four applications have production images, built from the repository root and
pushed to GHCR by `.github/workflows/deploy.yml` on every relevant push to
`master`. They run on a self-hosted Coolify instance (project `iaeste-lleida`,
one `localhost` server) behind Traefik, which terminates TLS with Let's Encrypt
certificates. The public site moved here from Vercel on 2026-08-29.

| Image                 | Dockerfile                     | Port | Health path   | Host                            |
| --------------------- | ------------------------------ | ---- | ------------- | ------------------------------- |
| `iaeste-web`          | `apps/web/Dockerfile`          | 3000 | `/ca`         | `iaestelleida.cat`, `www.`      |
| `iaeste-inscripcions` | `apps/inscripcions/Dockerfile` | 3003 | `/`           | `inscripcions.iaestelleida.cat` |
| `iaeste-api`          | `apps/api/Dockerfile`          | 3004 | `/health`     | `api.iaestelleida.cat`          |
| `iaeste-admin`        | `apps/admin/Dockerfile`        | 3005 | `/sign-in`    | `admin.iaestelleida.cat`        |
| `iaeste-cms`          | `apps/cms/Dockerfile`          | 3006 | `/api/health` | `cms.iaestelleida.cat`          |

Each Coolify resource has its own container healthcheck **disabled** — the
`node:22-slim` images carry no `curl`/`wget` for Coolify's generated check to
run, and every Dockerfile already ships a Node-based `HEALTHCHECK`. The API
resource carries a stable `iaeste-api` network alias on the `coolify` network;
`apps/admin` reaches the API at `http://iaeste-api:3004` (baked as a build arg,
since `next.config.ts` rewrites are serialised at build time), and the API
reaches Postgres by the database resource's UUID on that same network.

## Image layout

Build every image from the repository root. npm workspaces need the root
lockfile, and each application imports TypeScript source from workspace
packages.

```sh
docker build -f apps/web/Dockerfile -t iaeste-web .
docker build -f apps/inscripcions/Dockerfile -t iaeste-inscripcions .
docker build -f apps/api/Dockerfile -t iaeste-api .
```

Each Dockerfile starts with `turbo prune <workspace> --docker`. The pruned
package manifests form a cacheable `npm ci` layer; the pruned source then feeds
the application build. The root `.dockerignore` excludes Git data, dependency
directories, build output, local environment files, and editor files from the
build context.

The two Next.js applications use `output: "standalone"` and set
`outputFileTracingRoot` to the repository root. Their runtime stages contain
only the standalone server, static files, and `public`. Both run as uid 1001
and bind `0.0.0.0`.

The API compiles `server.ts` and `migrate.ts` with its workspace imports
bundled. Third-party production dependencies remain in a pruned
`node_modules`; source files and dev dependencies do not enter the runtime
image. Its entrypoint runs the compiled migrator before starting Hono. The
migrator:

1. opens the configured PostgreSQL connection;
2. takes the `iaeste-schema-migrations` PostgreSQL advisory lock;
3. applies the committed files under `packages/db/drizzle`;
4. releases the lock and connection;
5. starts the HTTP server only after migration succeeds.

A migration or connection failure exits the container before it can become
healthy. This deployment assumes one API replica, as specified in the project
plan. The advisory lock still prevents two overlapping deployment attempts
from applying migrations together. `SIGTERM` and `SIGINT` stop new HTTP
connections and close the shared PostgreSQL pool, with a ten-second forced-exit
limit.

## Configuration boundary

Never pass real secrets as Docker build arguments. Docker records build
arguments in image history.

### Public web site

Next.js compiles both `NEXT_PUBLIC_*` values into the bundle. Changing either
one requires a new image.

| Variable                                | Build value                          | Runtime value |
| --------------------------------------- | ------------------------------------ | ------------- |
| `NEXT_PUBLIC_INSCRIPCIONS_STATE`        | real value                           | none          |
| `NEXT_PUBLIC_KEYSTATIC_GITHUB_APP_SLUG` | real value when Keystatic is enabled | none          |

The web build also receives non-secret placeholders for the server values that
Next.js validates while collecting page data. Coolify must supply their real
values at runtime:

- `RESEND_API_KEY`
- `CONTACT_FORM_FROM`
- `CONTACT_FORM_TO`
- `KEYSTATIC_GITHUB_CLIENT_ID`
- `KEYSTATIC_GITHUB_CLIENT_SECRET`
- `KEYSTATIC_SECRET`

### Registration site

All registration-site configuration is public and compiled into the bundle.
Coolify does not need runtime variables for this image.

- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_INSCRIPCIONS_STATE`
- `NEXT_PUBLIC_WHATSAPP_INVITE`

### API

The API image contains placeholder configuration only while compiling the
OpenAPI document. Set the real values on the Coolify resource:

- `DATABASE_URL`
- `CORS_ALLOWED_ORIGINS`
- `RESEND_API_KEY`
- `REGISTRATION_EMAIL_FROM`
- `INSCRIPCIONS_PUBLIC_ORIGIN`
- `ADMIN_PUBLIC_ORIGIN`

The image fixes `API_PORT=3004`. The dormant Google Sheets projection reads
the `SHEETS_*` variables only when called; it is not part of registration or
container startup.

### CMS

`iaeste-cms` is a Payload CMS with its **own** PostgreSQL database
(`iaeste_cms`, role `iaeste_cms` privileged only on that database — never the
API's `DATABASE_URL`) and its **own** media volume. The image bakes only
non-secret placeholders while `next build` compiles `@repo/env/cms/server`.
Set the real values on the Coolify resource:

- `CMS_DATABASE_URL` — the isolated `iaeste_cms` database
- `CMS_PAYLOAD_SECRET` — ≥ 32 random bytes (`openssl rand -base64 32`)
- `CMS_PUBLIC_ORIGIN` — `https://cms.iaestelleida.cat`
- `CMS_MEDIA_DIR` — `/data/media` (the persistent volume mount)
- `CMS_EMAIL_FROM`, `RESEND_API_KEY` — account and password-reset email
- `CMS_PREVIEW_SECRET` — shared with `apps/web` for signed draft preview
- `WEB_PUBLIC_ORIGIN`, `WEB_REVALIDATE_URL`, `WEB_REVALIDATE_SECRET` — the
  public site origin and its protected cache-invalidation endpoint + secret

`apps/web` gains the matching `BLOG_SOURCE` (`keystatic` until cutover),
`CMS_INTERNAL_URL`, `CMS_PUBLIC_ORIGIN`, `CMS_PREVIEW_SECRET` and
`WEB_REVALIDATE_SECRET`.

Mount the media volume at `/data/media` through Coolify persistent storage and
verify uid 1001 can create, read and delete files before inviting editors. A
database backup without its matching media backup is incomplete — configure
daily backups of both `iaeste_cms` and `/data/media`, 30-day retention for the
first production month, and run one restore drill (an imported article, its
cover image and an older draft version must all survive).

The container entrypoint runs `payload migrate` before Next starts; a
migration failure stops the container before it can become healthy. This is
independent of the API's Drizzle migrator — neither touches the other's
schema.

Deploy order: `deploy-cms` runs after `deploy-api` and before `deploy-web`, so
a web change never ships ahead of the CMS it reads. New secrets/variables:
`COOLIFY_CMS_DEPLOY_WEBHOOK`, `COOLIFY_CMS_HEALTH_URL`.

## GitHub Actions and GHCR

`.github/workflows/deploy.yml` runs only for relevant pushes to `master` and
manual rollbacks. Pull requests run `.github/workflows/ci.yml`, which compiles
the workspaces and builds all four Dockerfiles without logging in to GHCR,
pushing images, or calling Coolify.

On an ordinary push, the workflow builds all four images. A change limited to
`content/**` or `keystatic.config.ts` is the one exception: it selects only
`iaeste-web`, preserving the blog publishing flow without rerunning the API
migration entrypoint.

The selected images build in parallel and receive two tags:

- `main`, the moving production tag configured in Coolify;
- `sha-<full commit SHA>`, the immutable rollback tag.

`docker/metadata-action` also attaches OCI source and revision labels. Each
image has a separate GitHub Actions build cache. Build jobs have only
`contents: read` and `packages: write`; deployment jobs have `contents: read`.

After all selected builds finish, the workflow deploys in this order:

1. API, except for a content-only deployment;
2. registration site and public web site, in parallel, after the API reports a
   finished deployment and passes its public health check.

The API gate matters because its entrypoint applies migrations. A failed image
build, migration, Coolify deployment, or health check blocks both frontend
deployments. Only content-only changes skip the API deployment.

The workflow uses each resource's authenticated Coolify deploy webhook, then
polls `GET /api/v1/deployments/{uuid}`. An accepted webhook is not treated as a
successful deployment. Once Coolify reports `finished`, the workflow also
checks the configured public health URL.

## GitHub repository setup

Add these Actions secrets:

| Secret                                | Purpose                                      |
| ------------------------------------- | -------------------------------------------- |
| `COOLIFY_TOKEN`                       | Coolify API token with deploy permission     |
| `COOLIFY_API_DEPLOY_WEBHOOK`          | Deploy webhook copied from the API resource  |
| `COOLIFY_INSCRIPCIONS_DEPLOY_WEBHOOK` | Deploy webhook for the registration resource |
| `COOLIFY_WEB_DEPLOY_WEBHOOK`          | Deploy webhook for the public web resource   |

Add these repository variables:

| Variable                                | Value                                    |
| --------------------------------------- | ---------------------------------------- |
| `NEXT_PUBLIC_API_URL`                   | public API origin                        |
| `NEXT_PUBLIC_INSCRIPCIONS_STATE`        | `on` or `off`; defaults to `on` in CI    |
| `NEXT_PUBLIC_WHATSAPP_INVITE`           | committee invitation URL                 |
| `NEXT_PUBLIC_KEYSTATIC_GITHUB_APP_SLUG` | Keystatic GitHub App slug                |
| `COOLIFY_API_HEALTH_URL`                | public API `/health` URL                 |
| `COOLIFY_INSCRIPCIONS_HEALTH_URL`       | public registration-site URL             |
| `COOLIFY_WEB_HEALTH_URL`                | public web URL, normally ending in `/ca` |

`GITHUB_TOKEN` handles the GHCR login. If GHCR keeps the packages private, add
a registry credential with `read:packages` to the Coolify server.

## Coolify resources

Create one **Docker Image** resource per application. Do not choose a source
repository, Dockerfile, Nixpacks, or another source-build option. Configure:

| Resource     | Image                                      | Port | Health path |
| ------------ | ------------------------------------------ | ---- | ----------- |
| web          | `ghcr.io/<owner>/iaeste-web:main`          | 3000 | `/ca`       |
| inscripcions | `ghcr.io/<owner>/iaeste-inscripcions:main` | 3003 | `/`         |
| api          | `ghcr.io/<owner>/iaeste-api:main`          | 3004 | `/health`   |
| admin        | `ghcr.io/<owner>/iaeste-admin:main`        | 3005 | `/sign-in`  |

Set each hostname, enable automatic TLS and HTTP-to-HTTPS redirects, disable
Coolify's own healthcheck (see the intro), and copy the authenticated deploy
webhook into the matching GitHub secret. Put database and registration-email
credentials only on the API resource. Keep the database on Coolify's managed
network rather than exposing PostgreSQL publicly.

## Rollback

Open the **Deploy** workflow in GitHub Actions and choose **Run workflow**.
Enter an existing `sha-<40 lowercase hex characters>` tag and select one
resource. Select `all` only when that SHA tag exists for all four images, such
as a commit that changed the workflow or root lockfile.

The rollback uses Coolify's application rollback endpoint. An `all` rollback
still runs the API first and waits for migration, deployment completion, and
health before it starts any of the three frontend rollbacks (admin, web,
inscripcions). The workflow rejects `main` and malformed tags so rollback
cannot silently select a moving image.

To fall back to Vercel entirely: restore the dinahosting A records to Vercel's
`76.76.21.21` (apex and `www`), re-add the `inscripcions`/`admin` CNAMEs, and
re-attach the domains in the Vercel projects. Coolify keeps running untouched
and the database is separate, so there is no data migration either way.

## Local verification

The registration image can run without runtime variables because its public
configuration is already compiled:

```sh
docker run --rm -p 3003:3003 iaeste-inscripcions
curl -fsS http://localhost:3003/
```

For the API, start a disposable PostgreSQL container on a private Docker
network, then point the API at it:

```sh
docker network create iaeste-local
docker run --rm -d --name iaeste-postgres --network iaeste-local \
  -e POSTGRES_USER=iaeste \
  -e POSTGRES_PASSWORD=local-password \
  -e POSTGRES_DB=iaeste_dev \
  postgres:16-alpine

docker run --rm --name iaeste-api --network iaeste-local -p 3004:3004 \
  -e DATABASE_URL=postgres://iaeste:local-password@iaeste-postgres:5432/iaeste_dev \
  -e CORS_ALLOWED_ORIGINS=http://localhost:3003 \
  -e RESEND_API_KEY=local-placeholder \
  -e REGISTRATION_EMAIL_FROM=noreply@iaestelleida.cat \
  -e INSCRIPCIONS_PUBLIC_ORIGIN=http://localhost:3003 \
  -e ADMIN_PUBLIC_ORIGIN=http://localhost:3005 \
  iaeste-api
```

The API log should print `Database migrations are current` before its listening
message. `curl -fsS http://localhost:3004/health` should return status `ok`.
Stopping the container should log the `SIGTERM` shutdown message and exit with
code zero.
