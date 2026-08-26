# Deployment (IA-08 spike)

Status: `apps/web`'s Docker image builds and runs locally, verified with
`docker build` / `docker run` (see "Local verification" below). **The
Coolify deployment described in this document has not been performed.**
Nobody has pushed an image to GHCR from CI, and no Coolify resource exists
yet — this is the recipe to follow when that happens, not a record that it
did. GHCR credentials and a Coolify instance weren't available while writing
this, so the GitHub Actions workflow and the Coolify steps below are
written correctly per the platforms' documented flows but are unverified
end to end.

This is deliberately scoped to one app. The point of IA-08 was to hit the
friction of containerizing a Turborepo workspace — root-hoisted
dependencies, file tracing across workspace packages, GHCR auth, Coolify's
prebuilt-image mode — while only `apps/web` was involved, before repeating
the exercise three more times for `inscripcions`, `admin`, and `api`
(IA-60/IA-61). Read this doc before doing those; most of the friction here
generalizes.

## Why the Dockerfile looks like this

`apps/web/Dockerfile` builds from the **repository root**, not
`apps/web/`. This is an npm-workspaces monorepo: `apps/web` imports
`@repo/ui`, `@repo/env`, `@repo/constants` and `@repo/email` as TypeScript
source (none of them has a compiled `dist`), and `npm ci` needs the root
`package-lock.json` to install reproducibly. A build context scoped to
`apps/web/` can see neither.

```sh
docker build -f apps/web/Dockerfile -t iaeste-web .
```

**`next.config.ts` sets `output: "standalone"`.** Next.js's standalone
output produces a self-contained `server.js` plus a `node_modules` pruned
by file-tracing the actual import graph, so the runtime image needs neither
`npm install` nor the source tree. It also sets `outputFileTracingRoot` to
the repo root: the default tracing root is `apps/web` itself, which is
correct for a single-package app but wrong here — the trace has to follow
symlinked workspace dependencies up through `node_modules/@repo/*` to their
real location under `packages/*` at the monorepo root, or those packages
silently drop out of the traced `node_modules`.

**The image has four stages** (`pruner` → `installer` → `builder` →
`runner`), using `turbo prune web --docker` in the first stage. `turbo
prune` trims the workspace down to exactly `apps/web` and the workspace
packages it actually depends on (`@repo/ui`, `@repo/env`,
`@repo/constants`, `@repo/email`, plus their tooling configs), split into
`out/json/` (just the package.json files and the lockfile, for a
cacheable `npm ci` layer) and `out/full/` (the pruned source). This is the
documented Turborepo pattern for exactly this problem — see
[turbo.build's Docker guide](https://turbo.build/repo/docs/guides/tools/docker)
— and it's what keeps the `installer` stage from installing `apps/api`'s
and `apps/inscripcions`'s dependencies too. The final `runner` stage copies
only `.next/standalone`, `.next/static` and `public/` out of the builder,
runs as a non-root user (`nextjs`, uid 1001), binds `0.0.0.0:3000`, and
ships no `node_modules`, no source, and no devDependencies.

## Build-time vs. runtime configuration

This is the part worth getting right, because it's not symmetric.

`packages/env/src/web.client.ts` and `web.server.ts` are the two schemas
`apps/web` validates against (see `packages/env/AGENTS.md` and
`AGENTS.md`'s "Configuration goes through `@repo/env`" rule). They split
along exactly the build/runtime line:

| Variable                                | Schema       | Needed at build time             | Needed at container runtime  |
| --------------------------------------- | ------------ | -------------------------------- | ---------------------------- |
| `NEXT_PUBLIC_INSCRIPCIONS_STATE`        | `web.client` | Yes — must be the **real** value | No — already compiled in     |
| `NEXT_PUBLIC_KEYSTATIC_GITHUB_APP_SLUG` | `web.client` | Real value when admin is enabled | No — already compiled in     |
| `RESEND_API_KEY`                        | `web.server` | Yes, but a placeholder is fine   | Yes — must be the real value |
| `CONTACT_FORM_FROM`                     | `web.server` | Yes, but a placeholder is fine   | Yes — must be the real value |
| `CONTACT_FORM_TO`                       | `web.server` | Yes, but a placeholder is fine   | Yes — must be the real value |
| `KEYSTATIC_GITHUB_CLIENT_ID`            | `web.server` | A placeholder is fine            | Real value for the admin     |
| `KEYSTATIC_GITHUB_CLIENT_SECRET`        | `web.server` | A placeholder is fine            | Real value for the admin     |
| `KEYSTATIC_SECRET`                      | `web.server` | A placeholder is fine            | Real value for the admin     |

Why the required values are needed at build time at all: `next build`'s "Collecting
page data" step evaluates every server module reachable from a route,
which includes `apps/web/src/lib/emails.ts` — the contact-form server
action — because it constructs a Resend client at module scope
(`createResendEmailer({ apiKey: env.RESEND_API_KEY, ... })`), and
`packages/env/src/parse.ts` validates eagerly on import. No value at all
means the build fails, even for a variable nothing renders.

Why they diverge after that: Next.js inlines `NEXT_PUBLIC_*` variables into
both the client _and_ server webpack bundles at build time via a literal
text substitution — the compiled output no longer contains
`process.env.NEXT_PUBLIC_INSCRIPCIONS_STATE`, it contains the string `"on"`
(or whatever it was at build time). Setting it again on the running
container does nothing; changing it requires rebuilding and redeploying
the image. `RESEND_API_KEY`, `CONTACT_FORM_FROM` and `CONTACT_FORM_TO` are
not `NEXT_PUBLIC_*`, so they are never inlined — the compiled server action
still reads `process.env.RESEND_API_KEY` fresh, every time, in the running
Node process. A placeholder at build time only needs to satisfy
`parseEnv`'s validation (any well-formed string / email); the container
won't be able to send real email until the real values are set on the
running container.

Practically: **bake the real `NEXT_PUBLIC_INSCRIPCIONS_STATE` and
`NEXT_PUBLIC_KEYSTATIC_GITHUB_APP_SLUG` in as build args, and set the real
server-only values as runtime environment variables on the Coolify
resource.** Never put real secrets in a `--build-arg` — Docker records build
args in the image's build history. The Dockerfile supplies temporary
Keystatic credentials only to the build process; they are not persisted as
image environment variables.

## GHCR push flow

`.github/workflows/deploy.yml` runs on pushes to `master` that can affect the
web image (never on a pull request — PRs only get `ci.yml`'s verify/build
jobs, so a fork can't push an image). Its path filter explicitly includes
`content/**` and `keystatic.config.ts`, so editorial commits produce a fresh
image too. It:

1. Logs into `ghcr.io` using `github.actor` / `GITHUB_TOKEN` — no PAT
   needed, following
   [GHCR's documented GitHub Actions flow](https://docs.github.com/en/actions/publishing-packages/publishing-docker-images).
2. Builds `apps/web/Dockerfile` with the repo root as context, using
   `docker/build-push-action` (buildx under the hood, with GitHub Actions
   layer caching).
3. Tags the image `ghcr.io/<owner>/iaeste-web:latest` and
   `ghcr.io/<owner>/iaeste-web:sha-<full-sha>`, and attaches OCI labels
   (`org.opencontainers.image.revision`, `.source`, etc.) via
   `docker/metadata-action`.
4. Pushes both tags.

The job's permissions are scoped to `contents: read` and `packages:
write` — nothing else.

**Unverified**: this workflow has not actually run against a real GHCR
registry from this repo. The GHCR package needs to exist (or be created on
first push) and be linked to the repo; if the package's visibility
defaults to private, the Coolify resource below will need a registry
credential, not just a public image URL.

## Wiring up the Coolify resource

Coolify supports two ways to deploy a project: build from source, or run a
prebuilt image. This uses the second — Coolify never sees the Dockerfile
or the monorepo, it only pulls whatever `deploy.yml` pushed.

1. **Create a new resource** in the target Coolify project/environment,
   choosing **"Docker Image"** (not "Public Repository" / "Dockerfile") as
   the resource type. This is the prebuilt-image path, not a source build.
2. **Image**: `ghcr.io/<owner>/iaeste-web:latest` (or pin to a
   `sha-<commit>` tag for a specific, reproducible deploy instead of
   tracking `latest`).
3. **Registry credentials**: if the GHCR package ends up private, add a
   registry credential in Coolify (a GitHub PAT with `read:packages`
   scope, or a GHCR-scoped token) so Coolify can pull it. A public GHCR
   package needs no credential.
4. **Port**: the container listens on `3000` (see `EXPOSE 3000` in the
   Dockerfile and `PORT=3000` / `HOSTNAME=0.0.0.0` baked into its runtime
   env) — set Coolify's exposed/target port to `3000`.
5. **Domain / hostname**: set the resource's hostname to the intended
   production domain (e.g. `iaestelleida.cat`). Coolify's built-in Traefik
   instance picks this up automatically to generate the routing labels —
   no manual Traefik config needed for a single-container HTTP service
   like this one.
6. **TLS**: enable "Force HTTPS" / automatic Let's Encrypt on the
   resource. Coolify's Traefik handles ACME issuance once the domain's DNS
   points at the Coolify host.
7. **Runtime environment variables** — set these on the Coolify resource
   itself (not as build args, they're irrelevant post-build):

   - `RESEND_API_KEY` — the real Resend API key.
   - `CONTACT_FORM_FROM` — the real "from" address for contact-form email.
   - `CONTACT_FORM_TO` — the real destination address.
   - `KEYSTATIC_GITHUB_CLIENT_ID` — the GitHub App client ID.
   - `KEYSTATIC_GITHUB_CLIENT_SECRET` — the GitHub App client secret.
   - `KEYSTATIC_SECRET` — a long random value used to secure Keystatic's
     session state.

   Do **not** set either `NEXT_PUBLIC_*` value only here — it has no effect at
   runtime (see the table above). Set
   `NEXT_PUBLIC_KEYSTATIC_GITHUB_APP_SLUG` as the GitHub Actions repository
   variable used by `deploy.yml`; changing either public value requires a
   rebuild and redeploy.

8. **Deploy** and confirm the container serves traffic on the configured
   domain, then confirm a contact-form submission actually sends an email
   end to end (this exercises the one server-only code path that a bare
   "does it boot" check doesn't).

None of step 8 has been done — there is no Coolify instance available to
this spike. Whoever wires this up for real should treat this document as a
checklist, not a confirmation.

## Local verification

Since there's no GHCR/Coolify access available here, verification was
scoped to what `docker build` / `docker run` can confirm locally:

```sh
docker build -f apps/web/Dockerfile -t iaeste-web:spike .
docker run --rm -p 3000:3000 \
  -e RESEND_API_KEY=runtime-placeholder \
  -e CONTACT_FORM_FROM=noreply@iaestelleida.cat \
  -e CONTACT_FORM_TO=ci@example.com \
  iaeste-web:spike
curl -sf http://localhost:3000/ca
```

See the IA-08 commit history for the actual output of this run.

## Follow-up for IA-60/IA-61 (containerizing inscripcions, admin, api)

- The `pruner`/`installer`/`builder`/`runner` shape and the
  `turbo prune <app> --docker` step generalize directly — copy
  `apps/web/Dockerfile`, swap the `turbo prune` target and the final
  `CMD`/`EXPOSE`.
- `apps/inscripcions` will need `output: "standalone"` and the same
  `outputFileTracingRoot` fix in its own `next.config`.
- `apps/api` is not a Next.js app (Hono), so its Dockerfile doesn't need
  the standalone-output dance at all — it's closer to a plain
  `npm ci && npm run build && npm start` image. README.md documents it as
  an independently deployable Node service; IA-60 will add its production
  container.
- `admin` doesn't exist yet (later milestone per
  `docs/membership-lifecycle.md`) — nothing to containerize until it does.
- `deploy.yml` will need a job per app once there's more than one image to
  push; consider whether they should share the workflow file or split,
  once it's clear whether they deploy on the same cadence.
