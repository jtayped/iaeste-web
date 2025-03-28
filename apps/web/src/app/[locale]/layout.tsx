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
import AnalyticsWrapper from "./analytics";
import { generatePageMetadata } from "@/lib/metadata";

const inter = Inter({ weight: "variable", subsets: ["latin"] });

export function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  return generatePageMetadata({ params, pageKey: "HomePage" });
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
        <AnalyticsWrapper />
      </body>
    </html>
  );
}
