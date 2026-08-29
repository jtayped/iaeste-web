import { z } from "zod";

import { parseEnv } from "./parse";

const schema = z.object({
  RESEND_API_KEY: z.string().min(1),
  CONTACT_FORM_FROM: z.string().email(),
  CONTACT_FORM_TO: z.string().email(),
  /**
   * Which backend the blog reader uses during the Payload migration. Flip to
   * `payload` at cutover; `keystatic` is the pre-migration default and the
   * rollback target during the observation week.
   */
  BLOG_SOURCE: z.enum(["keystatic", "payload"]).default("keystatic"),
  /**
   * Server-only origin of `apps/cms` for the narrow public blog API. On
   * Coolify this is the internal service address; locally the dev port.
   */
  CMS_INTERNAL_URL: z.string().url().default("http://localhost:3006"),
  /** Shared secret for the signed draft-preview flow (see apps/cms). */
  CMS_PREVIEW_SECRET: z.string().min(32).optional(),
  /** Shared secret the CMS signs its cache-invalidation POSTs with. */
  WEB_REVALIDATE_SECRET: z.string().min(32).optional(),
  KEYSTATIC_GITHUB_CLIENT_ID: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().min(1).optional(),
  ),
  KEYSTATIC_GITHUB_CLIENT_SECRET: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().min(1).optional(),
  ),
  KEYSTATIC_SECRET: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().min(1).optional(),
  ),
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
    BLOG_SOURCE: process.env.BLOG_SOURCE,
    CMS_INTERNAL_URL: process.env.CMS_INTERNAL_URL,
    CMS_PREVIEW_SECRET: process.env.CMS_PREVIEW_SECRET,
    WEB_REVALIDATE_SECRET: process.env.WEB_REVALIDATE_SECRET,
    KEYSTATIC_GITHUB_CLIENT_ID: process.env.KEYSTATIC_GITHUB_CLIENT_ID,
    KEYSTATIC_GITHUB_CLIENT_SECRET: process.env.KEYSTATIC_GITHUB_CLIENT_SECRET,
    KEYSTATIC_SECRET: process.env.KEYSTATIC_SECRET,
  },
  "web server",
);
