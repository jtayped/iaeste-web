# Deployment

Three applications have production images. All three images build and run
locally. `apps/admin` does not exist yet and has no image.

## Status (2026-08-28)

The Coolify side of this doc is now partly real, not just instructions:

- **Project `iaeste-lleida`** exists (environment `production`), with three
  **Docker Image** resources already created and configured per the tables
  below (image, port, health path, domain, TLS): `iaeste-api`,
  `iaeste-inscripcions`, `iaeste-web`. Non-secret runtime env vars are set
  (`NODE_ENV`, `CORS_ALLOWED_ORIGINS`, `BETTER_AUTH_TRUSTED_ORIGINS`,
  `REGISTRATION_EMAIL_FROM`, `*_PUBLIC_ORIGIN`, `CONTACT_FORM_*`). A fresh
  `BETTER_AUTH_SECRET` was generated and set on the API resource.
- **Still open, in order:**
  1. `.github/workflows/deploy.yml`, `.github/scripts/deploy-coolify.mjs`, and
     the three `Dockerfile`s only exist on `local/dev-preview` — none of this
     is on `master` yet, so GHCR has no images and the workflow can't run
     until this work merges.
  2. **Database**: this project shares the `postgres` Coolify resource in the
     `general` project (one Postgres instance, multiple databases) rather than
     getting a dedicated server. A dedicated `iaeste` database + a
     least-privilege `iaeste` role (not the shared superuser) still need
     creating on it; `DATABASE_URL` on the API resource should then use that
     resource's **internal** Coolify network hostname
     (`<postgres-resource-uuid>:5432`), never the public port — see
     "Coolify resources" below.
  3. **DNS**: `www`, `inscripcions`, and `api` on `iaestelleida.cat` all need
     an A record pointing at `23.88.32.157` (the Hetzner VPS Coolify runs on).
     Not done yet — Coolify can't issue TLS certs until this resolves.
  4. **Secrets not yet set** on the Coolify resources: `RESEND_API_KEY` (api +
     web), `DATABASE_URL` (api, blocked on the DB step above),
     `KEYSTATIC_GITHUB_CLIENT_ID`/`_SECRET`/`KEYSTATIC_SECRET` (web — needs
     the one-time GitHub App setup in `docs/content.md`).
  5. **GitHub Actions secrets/vars** in the "GitHub repository setup" section
     below — none are set yet. The three deploy-webhook URLs already exist
     (each Coolify resource has one at `/api/v1/deploy?uuid=<resource-uuid>`)
     but haven't been copied into GitHub secrets.
  6. GHCR registry credential on the Coolify server, if the `iaeste-*`
     packages end up private — not yet checked, since no image has been
     pushed yet to have a visibility setting.

| Image                 | Dockerfile                     | Port | Health URL |
| --------------------- | ------------------------------ | ---- | ---------- |
| `iaeste-web`          | `apps/web/Dockerfile`          | 3000 | `/ca`      |
| `iaeste-inscripcions` | `apps/inscripcions/Dockerfile` | 3003 | `/`        |
| `iaeste-api`          | `apps/api/Dockerfile`          | 3004 | `/health`  |

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

## GitHub Actions and GHCR

`.github/workflows/deploy.yml` runs only for relevant pushes to `master` and
manual rollbacks. Pull requests run `.github/workflows/ci.yml`, which compiles
the workspaces and builds all three Dockerfiles without logging in to GHCR,
pushing images, or calling Coolify.

On an ordinary push, the workflow builds all three images. A change limited to
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

Set each hostname, enable automatic TLS and HTTP-to-HTTPS redirects, and copy
its authenticated deploy webhook into the matching GitHub secret. Put database
and registration-email credentials only on the API resource. Keep the database
on Coolify's managed network rather than exposing PostgreSQL publicly.

## Rollback

Open the **Deploy** workflow in GitHub Actions and choose **Run workflow**.
Enter an existing `sha-<40 lowercase hex characters>` tag and select one
resource. Select `all` only when that SHA tag exists for all three images, such
as a commit that changed the workflow or root lockfile.

The rollback uses Coolify's application rollback endpoint. An `all` rollback
still runs the API first and waits for migration, deployment completion, and
health before it starts either frontend rollback. The workflow rejects `main`
and malformed tags so rollback cannot silently select a moving image. The
admin image and resource must be added here when `apps/admin` is implemented.

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
