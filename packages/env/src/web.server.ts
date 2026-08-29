import { z } from "zod";

import { parseEnv } from "./parse";

const schema = z.object({
  RESEND_API_KEY: z.string().min(1),
  CONTACT_FORM_FROM: z.string().email(),
  CONTACT_FORM_TO: z.string().email(),
  /**
   * Server-only origin of `apps/cms` for the narrow public blog API. On
   * Coolify this is the internal service address; locally the dev port.
   */
  CMS_INTERNAL_URL: z.string().url().default("http://localhost:3006"),
  /**
   * Browser-facing origin of `apps/cms`, used only to build absolute media
   * URLs for `next/image`. Must match the `remotePatterns` entry in
   * next.config.ts.
   */
  CMS_PUBLIC_ORIGIN: z.string().url().default("http://localhost:3006"),
  /** Shared secret for the signed draft-preview flow (see apps/cms). */
  CMS_PREVIEW_SECRET: z.string().min(32).optional(),
  /** Shared secret the CMS signs its cache-invalidation POSTs with. */
  WEB_REVALIDATE_SECRET: z.string().min(32).optional(),
});

/**
 * Secret configuration for the marketing site.
 *
 * Server-only: importing this from a client component throws, because Next.js
 * does not inline non-`NEXT_PUBLIC_` variables into the browser bundle.
 */
export const env = parseEnv(
  schema,
  {
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    CONTACT_FORM_FROM: process.env.CONTACT_FORM_FROM,
    CONTACT_FORM_TO: process.env.CONTACT_FORM_TO,
    CMS_INTERNAL_URL: process.env.CMS_INTERNAL_URL,
    CMS_PUBLIC_ORIGIN: process.env.CMS_PUBLIC_ORIGIN,
    CMS_PREVIEW_SECRET: process.env.CMS_PREVIEW_SECRET,
    WEB_REVALIDATE_SECRET: process.env.WEB_REVALIDATE_SECRET,
  },
  "web server",
);
