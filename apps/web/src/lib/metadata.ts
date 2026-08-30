import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { renderOgImage } from "@repo/ui/lib/og-image";

/**
 * Same origin the sitemap and the blog routes already hardcode. It has to be
 * set for the `opengraph-image` file convention to work at all: Next resolves
 * the generated card's URL against it, and without one it falls back to
 * `localhost:3000` and every share preview points at nothing.
 */
const SITE_ORIGIN = "https://iaestelleida.cat";

/**
 * Icons and the manifest are the same on every page, so they ride along here
 * rather than being repeated per layout. Next merges metadata parent-to-child,
 * so declaring them once at the root would be enough — but every layout in
 * this app goes through this function, and keeping them in it means a new
 * section cannot accidentally ship without them.
 */
const icons: Metadata["icons"] = {
  icon: [
    // `.ico` first for the clients that ignore everything else, then the
    // vector, which is what any current browser will actually pick.
    { url: "/favicon.ico", sizes: "any" },
    { url: "/icon.svg", type: "image/svg+xml" },
    { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
  ],
  apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
};

export async function generatePageMetadata({
  params,
  pageKey,
}: {
  params: Promise<{ locale: string }>;
  pageKey: string;
}): Promise<Metadata> {
  const { locale } = await params;

  // Load localized metadata from the "Metadata" namespace
  const t = await getTranslations({
    locale,
    namespace: `${pageKey}.Metadata`,
  });

  return {
    metadataBase: new URL(SITE_ORIGIN),
    title: t("title"),
    description: t("description"),
    applicationName: "IAESTE LC Lleida",
    manifest: "/manifest.webmanifest",
    icons,
    alternates: {
      canonical: "/ca",
      languages: {
        ca: "/ca",
        es: "/es",
        en: "/en",
      },
    },
    openGraph: {
      title: t("ogTitle"),
      description: t("ogDescription"),
      url: `${SITE_ORIGIN}/`,
      type: "website",
      // No `images` here on purpose. Each segment ships an `opengraph-image.tsx`
      // that renders its own card, and Next only picks those up if nothing
      // overrides them — an explicit array here wins and would pin every page
      // back to one static picture.
      // Set locale-specific OpenGraph locale code
      locale: locale === "ca" ? "ca_ES" : locale === "es" ? "es_ES" : "en_US",
      siteName: "iaeste lleida",
    },
    twitter: {
      // The file convention supplies `twitter:image` but never the card type,
      // so this one field still has to be declared by hand.
      card: "summary_large_image",
      title: t("twitterTitle"),
      description: t("twitterDescription"),
      creator: "@IAESTELCLleida",
      site: "@IAESTELCLleida",
    },
    keywords: t("keywords"),
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  };
}

/**
 * The share card for one page, from the same `pageKey` its metadata uses.
 *
 * Every `opengraph-image.tsx` in this app is a wrapper around this, so a
 * section that adds a translated `ogTitle` gets a card that matches its
 * `og:title` for free — and the two can never drift apart, because they read
 * the same key.
 */
export async function generatePageOgImage({
  params,
  pageKey,
}: {
  params: Promise<{ locale: string }>;
  pageKey: string;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: `${pageKey}.Metadata` });

  return renderOgImage(t("ogTitle"));
}
