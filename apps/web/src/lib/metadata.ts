import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { brandIcons, brandSocialHandle } from "@repo/ui/lib/brand-metadata";
import { renderOgImage } from "@repo/ui/lib/og-image";

/**
 * Same origin the sitemap and the blog routes already hardcode. It has to be
 * set for the `opengraph-image` file convention to work at all: Next resolves
 * the generated card's URL against it, and without one it falls back to
 * `localhost:3000` and every share preview points at nothing.
 */
const SITE_ORIGIN = "https://iaestelleida.cat";

/** Route for a `pageKey`, so canonicals and alternates point at the real page. */
const PAGE_PATHS: Record<string, string> = {
  HomePage: "",
  StudentsPage: "/student",
  CompanyPage: "/company",
  IncommingPage: "/incommings",
};

export async function generatePageMetadata({
  params,
  pageKey,
}: {
  params: Promise<{ locale: string }>;
  pageKey: string;
}): Promise<Metadata> {
  const { locale } = await params;
  // Every page used to declare `canonical: "/ca"` and `og:url` of the site
  // root, so /student, /company and /incommings each told Google they were
  // duplicates of the home page.
  const path = PAGE_PATHS[pageKey] ?? "";

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
    icons: brandIcons,
    alternates: {
      canonical: `/${locale}${path}`,
      languages: {
        ca: `/ca${path}`,
        es: `/es${path}`,
        en: `/en${path}`,
      },
    },
    openGraph: {
      title: t("ogTitle"),
      description: t("ogDescription"),
      url: `${SITE_ORIGIN}/${locale}${path}`,
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
      creator: brandSocialHandle,
      site: brandSocialHandle,
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
