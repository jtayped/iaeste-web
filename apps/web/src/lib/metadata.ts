import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";

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
    title: t("title"),
    description: t("description"),
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
      url: "https://iaestelleida.cat/",
      type: "website",
      images: [
        {
          url: "https://iaestelleida.cat/twitter.png",
          width: 700,
          height: 350,
          alt: t("ogTitle"),
        },
      ],
      // Set locale-specific OpenGraph locale code
      locale: locale === "ca" ? "ca_ES" : locale === "es" ? "es_ES" : "en_US",
      siteName: "IAESTE Lleida",
    },
    twitter: {
      card: "summary_large_image",
      title: t("twitterTitle"),
      description: t("twitterDescription"),
      creator: "@IAESTELCLleida",
      site: "@IAESTELCLleida",
      images: ["https://iaestelleida.cat/twitter.png"],
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
