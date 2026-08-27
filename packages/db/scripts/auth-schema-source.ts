// Config used only to generate `src/schema/auth.ts` — see
// `scripts/generate-auth-schema.ts` and the header comment on that schema
// file. Never imported at runtime: `drizzleAdapter({}, ...)` below is a stub
// adapter target, not a real database connection, because the CLI only needs
// enough shape to know which plugins add which tables.
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, magicLink } from "better-auth/plugins";

export const auth = betterAuth({
  database: drizzleAdapter({}, { provider: "pg" }),
  emailAndPassword: { enabled: false },
  plugins: [
    magicLink({
      sendMagicLink: async () => {
        // Never called: this config only drives schema generation.
      },
    }),
    // IA-30: the `member`/`admin` roles from docs/membership-lifecycle.md.
    // Options that only affect runtime behaviour (defaultRole, adminRoles,
    // disabledPaths on the real betterAuth() call) don't change the schema
    // shape, so they're omitted here — see packages/auth for the real config.
    admin(),
  ],
});
