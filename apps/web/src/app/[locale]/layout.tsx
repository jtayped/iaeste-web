import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@repo/ui/globals.css";
import Header, { NavigationProvider } from "@/components/header";
import Footer from "@/components/common/footer";

const inter = Inter({ weight: "variable", subsets: ["latin"] });

export const metadata: Metadata = {
  // Basic SEO metadata
  title: "IAESTE Lleida",
  description:
    "Organització sense ànim de lucre de l'Escola Politècnica Superior de la Universitat de Lleida.",

  alternates: {
    canonical: "/ca",
    languages: {
      ca: "/ca",
      es: "/es",
      en: "/en",
    },
  },

  // OpenGraph / Social Media Tags
  openGraph: {
    title: "IAESTE Lleida - International Student Internships",
    description:
      "Exchanging students for technical work experience in 100+ countries around the world.",
    url: "https://iaeste.udl.cat/",
    type: "website",

    // Recommended: Add high-quality, representative image
    images: [
      {
        url: "/twitter.png", // TODO: Replace with your social share image path
        width: 700,
        height: 350,
        alt: "IAESTE Lleida - International Student Exchanges",
      },
    ],

    locale: "ca_ES",
    siteName: "IAESTE Lleida",
  },

  twitter: {
    card: "summary_large_image",
    title: "IAESTE Lleida - International Student Internships",
    description:
      "Exchanging students for technical work experience in 100+ countries around the world.",

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

  // Robots meta tag for search engine crawling
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

export const runtime = "edge";

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
