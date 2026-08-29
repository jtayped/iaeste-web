import { z } from "zod";

import { parseEnv } from "./parse";

/**
 * The single place `apps/cms` reads configuration. Every other CMS module
 * imports from here; ESLint's `no-restricted-syntax` boundary forbids a raw
 * `process.env` read anywhere else in the workspace.
 *
 * Server-only. The Payload admin panel is a server-rendered React app, so
 * there is no client schema and no `NEXT_PUBLIC_` CMS variable.
 */
const schema = z.object({
  /** Connection to the isolated `iaeste_cms` database. Never the API's DB. */
  CMS_DATABASE_URL: z.string().url(),
  /** Payload cookie and token secret. At least 32 random bytes. */
  CMS_PAYLOAD_SECRET: z.string().min(32),
  /** Public origin of the CMS itself, e.g. https://cms.iaestelleida.cat. */
  CMS_PUBLIC_ORIGIN: z.string().url().default("http://localhost:3006"),
  /** Persistent upload path. `/data/media` in production. */
  CMS_MEDIA_DIR: z.string().min(1).default("./.data/media"),
  /** Sender used for account and password-reset email. */
  CMS_EMAIL_FROM: z.string().email().default("noreply@iaestelleida.cat"),
  /** Shared secret for the narrow draft-preview API. At least 32 bytes. */
  CMS_PREVIEW_SECRET: z.string().min(32),
  /** Public site origin, used to build preview redirect URLs. */
  WEB_PUBLIC_ORIGIN: z.string().url().default("http://localhost:3000"),
  /** Public site's protected cache-invalidation endpoint. */
  WEB_REVALIDATE_URL: z
    .string()
    .url()
    .default("http://localhost:3000/api/revalidate/blog"),
  /** Shared secret for cache invalidation. At least 32 bytes. */
  WEB_REVALIDATE_SECRET: z.string().min(32),
  /**
   * Resend API key. The CMS may reuse the marketing site's key, but it always
   * sends from its own `CMS_EMAIL_FROM`.
   */
  RESEND_API_KEY: z.string().min(1),
});

export const env = parseEnv(
  schema,
  {
    CMS_DATABASE_URL: process.env.CMS_DATABASE_URL,
    CMS_PAYLOAD_SECRET: process.env.CMS_PAYLOAD_SECRET,
    CMS_PUBLIC_ORIGIN: process.env.CMS_PUBLIC_ORIGIN,
    CMS_MEDIA_DIR: process.env.CMS_MEDIA_DIR,
    CMS_EMAIL_FROM: process.env.CMS_EMAIL_FROM,
    CMS_PREVIEW_SECRET: process.env.CMS_PREVIEW_SECRET,
    WEB_PUBLIC_ORIGIN: process.env.WEB_PUBLIC_ORIGIN,
    WEB_REVALIDATE_URL: process.env.WEB_REVALIDATE_URL,
    WEB_REVALIDATE_SECRET: process.env.WEB_REVALIDATE_SECRET,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
  },
  "cms server",
);
