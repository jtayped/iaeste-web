import { defineConfig } from "drizzle-kit";

import { getDatabaseUrl } from "./src/config";

// `drizzle-kit generate` never opens a connection (it diffs the schema
// modules against the committed migration snapshots in `./drizzle`), but
// its config type still requires `dbCredentials.url`, so DATABASE_URL must
// be set even for a pure `generate` run. `db:check`/`db:studio`/`migrate`
// do connect, using this same value.
//
// Note on the root `package.json`'s `drizzle-orm` devDependency: this file
// (and drizzle-kit generally) checks its own compatibility by dynamically
// importing `drizzle-orm/version` relative to *drizzle-kit's own install
// location*, not this package's. In this workspace, npm's resolver nests
// `drizzle-orm` under `packages/db/node_modules` (to satisfy `better-auth`'s
// optional peer on it) while hoisting `drizzle-kit` to the repo root — so
// without a root-level `drizzle-orm`, Node can never find one from
// drizzle-kit's location and every `drizzle-kit` command fails with
// "Please install latest version of drizzle-orm". The root devDependency
// exists purely to give drizzle-kit something to find; `@repo/db` itself
// still declares and imports its own `drizzle-orm` normally.
export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: getDatabaseUrl(),
  },
});
