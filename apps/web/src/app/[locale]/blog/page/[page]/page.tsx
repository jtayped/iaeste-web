import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import BlogIndex from "@/components/blog/blog-index";
import { getStaticPaginationParams, type BlogLocale } from "@/lib/blog";

export const dynamicParams = false;

export function generateStaticParams() {
  return getStaticPaginationParams();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: BlogLocale; page: string }>;
}): Promise<Metadata> {
  const { locale, page } = await params;
  const t = await getTranslations({ locale, namespace: "BlogPage.Metadata" });

  return {
    title: `${t("title")} · ${page}`,
    description: t("description"),
    alternates: { canonical: `/${locale}/blog/page/${page}` },
  };
}

export default async function BlogPaginationPage({
  params,
}: {
  params: Promise<{ locale: BlogLocale; page: string }>;
}) {
  const { locale, page } = await params;
  return <BlogIndex locale={locale} page={Number(page)} />;
}
