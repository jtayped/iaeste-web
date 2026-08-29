import path from "node:path";
import { fileURLToPath } from "node:url";

import { postgresAdapter } from "@payloadcms/db-postgres";
import { resendAdapter } from "@payloadcms/email-resend";
import { ca } from "@payloadcms/translations/languages/ca";
import { buildConfig } from "payload";
import sharp from "sharp";

import { env } from "@repo/env/cms/server";

import { Media } from "./collections/Media";
import { Posts } from "./collections/Posts";
import { Tags } from "./collections/Tags";
import { Users } from "./collections/Users";
import { postBodyEditor } from "./lib/lexical";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default buildConfig({
  serverURL: env.CMS_PUBLIC_ORIGIN,
  secret: env.CMS_PAYLOAD_SECRET,

  admin: {
    user: Users.slug,
    meta: {
      titleSuffix: " · continguts iaeste",
    },
    // Native panel. IAESTE branding (logo, navy) and the per-locale
    // completeness panel on the article edit view are added under
    // src/components/ once Payload packages are installed and
    // `generate:importmap` can run — see apps/cms/AGENTS.md.
  },

  collections: [Users, Posts, Tags, Media],

  editor: postBodyEditor,

  db: postgresAdapter({
    pool: { connectionString: env.CMS_DATABASE_URL },
    // Production runs committed migrations from ./src/migrations before the
    // server starts (see docker-entrypoint.sh). `schemaName` stays default —
    // isolation is a separate database, not a schema.
    migrationDir: path.resolve(dirname, "migrations"),
  }),

  localization: {
    locales: [
      { code: "ca", label: "català" },
      { code: "es", label: "castellà" },
      { code: "en", label: "anglès" },
    ],
    defaultLocale: "ca",
    fallback: true,
  },

  // Content localization (above) and admin-interface language (here) are
  // separate concerns. The panel is Catalan-only so uppercase English or
  // Spanish core labels cannot leak into the lowercase product.
  i18n: {
    supportedLanguages: { ca },
    fallbackLanguage: "ca",
    translations: {
      ca: {
        general: {
          dashboard: "tauler",
          createNew: "crea",
          save: "desa",
          saveDraft: "desa l'esborrany",
          publishChanges: "publica",
          unpublish: "retira de publicació",
        },
        version: {
          draft: "esborrany",
          published: "publicat",
          restoreThisVersion: "restaura aquesta versió",
        },
      },
    },
  },

  email: resendAdapter({
    apiKey: env.RESEND_API_KEY,
    defaultFromAddress: env.CMS_EMAIL_FROM,
    defaultFromName: "continguts iaeste lc lleida",
  }),

  // Exact allowlists — never "*".
  cors: [env.CMS_PUBLIC_ORIGIN, env.WEB_PUBLIC_ORIGIN],
  csrf: [env.CMS_PUBLIC_ORIGIN, env.WEB_PUBLIC_ORIGIN],

  sharp,

  typescript: {
    outputFile: path.resolve(dirname, "payload-types.ts"),
  },
});
