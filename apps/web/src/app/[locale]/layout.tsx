import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Header, { NavigationProvider } from "@/components/header";
import Footer from "@/components/common/footer";
import "@repo/ui/globals.css";
import "@/globals.css";

const inter = Inter({ weight: "variable", subsets: ["latin"] });

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  // Load localized metadata from the "Metadata" namespace
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: `/${locale}`,
      languages: {
        ca: "/ca",
        es: "/es",
        en: "/en",
      },
    },
    openGraph: {
      title: t("ogTitle"),
      description: t("ogDescription"),
      url: "https://iaeste.udl.cat/",
      type: "website",
      images: [
        {
          url: "/twitter.png", // Replace with your social share image path if needed
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
      images: ["/twitter.png"],
    },
    keywords: [
      "IAESTE",
      "internships",
      "estudiants",
      "Universitat de Lleida",
      "Escola Politècnica Superior",
      "intercanvis internacionals",
    ],
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

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Ensure that the incoming `locale` is valid
  if (!routing.locales.includes(locale as "ca" | "es" | "en")) {
    notFound();
  }

  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body className={`${inter.className}`}>
        <NextIntlClientProvider messages={messages}>
          <NavigationProvider>
            <Header />
            <main className="min-h-screen">{children}</main>
            <Footer />
          </NavigationProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
