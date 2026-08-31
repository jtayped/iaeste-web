import type { Metadata } from "next";

/**
 * Stable brand metadata shared by every IAESTE Lleida Next.js app.
 *
 * The matching files come from `assets/brand/generate-brand.mjs`, which writes
 * the same icon set into each app's `public/` directory. Keeping the metadata
 * here means a newly generated size cannot be forgotten by one app.
 */
export const brandIcons = {
  icon: [
    { url: "/favicon.ico", sizes: "any" },
    { url: "/icon.svg", type: "image/svg+xml" },
    { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
  ],
  apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
} satisfies Metadata["icons"];

/** The account credited on public share cards. */
export const brandSocialHandle = "@IAESTELCLleida";
