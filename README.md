# IAESTE LC Lleida Web

IAESTE LC Lleida's Turborepo contains the public websites and a separately
deployable HTTP API.

## Local development

Copy `.env.example` to `.env` and fill it in. Every variable there is required
unless marked optional: the apps validate their configuration at startup
(`packages/env`) and fail with a named error rather than booting misconfigured.

```sh
npm install
npm run dev
```

| Workspace           | URL                     |
| ------------------- | ----------------------- |
| `apps/web`          | <http://localhost:3000> |
| `apps/inscripcions` | <http://localhost:3003> |
| `apps/api`          | <http://localhost:3004> |

## Checks

These are the CI gates. Run them from the root before pushing:

```sh
npm run format:check
npm run lint          # warnings are errors
npm run check-types
npm run test
```

Scope any of them to a workspace while iterating, e.g.
`npm run --workspace @repo/constants test`.

Working on this repo with a coding agent? See [AGENTS.md](./AGENTS.md).

## API

The API is an independent Hono app under `apps/api`. Its initial endpoints are:

- `POST /v1/registrations`
- `GET /health`
- `GET /openapi.json`
- `GET /docs`

Route schemas generate `apps/api/openapi.json`. TypeScript clients are generated
from that document into `packages/api-client`:

```sh
npm run generate:api
```

CI fails if the committed output is stale.

## API deployment

Deploy `apps/api` as its own Node service with `npm run build` followed by
`npm start`. Production images and the Coolify deployment flow are documented
in `docs/deployment.md`.

Set `CORS_ALLOWED_ORIGINS` to the comma-separated frontend origins that may use
the API, for example `https://iaestelleida.cat`. Set `NEXT_PUBLIC_API_URL` on
each frontend deployment to the API origin. The production fallback is
`https://api.iaestelleida.cat`.

For independent Turborepo builds, use filters instead of the root build:

```sh
npx turbo run build --filter=@repo/api
npx turbo run build --filter=inscripcions
```
