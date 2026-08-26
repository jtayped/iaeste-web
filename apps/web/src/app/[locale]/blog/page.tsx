import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import BlogIndex from "@/components/blog/blog-index";
import { blogLocales, type BlogLocale } from "@/lib/blog";

export function generateStaticParams() {
  return blogLocales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: BlogLocale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "BlogPage.Metadata" });

  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: `/${locale}/blog`,
      languages: Object.fromEntries(
        blogLocales.map((entryLocale) => [entryLocale, `/${entryLocale}/blog`]),
      ),
    },
    openGraph: {
      title: t("title"),
      description: t("description"),
      type: "website",
      url: `https://iaestelleida.cat/${locale}/blog`,
      siteName: "iaeste lc lleida",
    },
  };
}

export default async function BlogPage({
  params,
}: {
  params: Promise<{ locale: BlogLocale }>;
}) {
  const { locale } = await params;
  return <BlogIndex locale={locale} page={1} />;
}
