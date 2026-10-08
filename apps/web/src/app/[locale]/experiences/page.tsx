import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import PageHeader from "@/components/common/sections/page-header";
import Section from "@/components/common/sections/section";
import { ExperienceGrid } from "@/components/experiences/experience-grid";
import { blogLocales, type BlogLocale } from "@/lib/blog";
import { getExperiences } from "@/lib/experiences";

export function generateStaticParams() {
  return blogLocales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: BlogLocale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const [t, experiences] = await Promise.all([
    getTranslations({ locale, namespace: "ExperiencesPage.Metadata" }),
    getExperiences(locale),
  ]);

  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: `/${locale}/experiences`,
      languages: Object.fromEntries(
        blogLocales.map((entryLocale) => [
          entryLocale,
          `/${entryLocale}/experiences`,
        ]),
      ),
    },
    openGraph: {
      title: t("title"),
      description: t("description"),
      type: "website",
      url: `https://iaestelleida.cat/${locale}/experiences`,
      siteName: "iaeste lc lleida",
    },
    // The sitemap leaves this page out while it is empty; keep the two in step.
    robots:
      experiences.length === 0 ? { index: false, follow: true } : undefined,
  };
}

export default async function ExperiencesPage({
  params,
}: {
  params: Promise<{ locale: BlogLocale }>;
}) {
  const { locale } = await params;
  const [t, experiences] = await Promise.all([
    getTranslations({ locale, namespace: "ExperiencesPage" }),
    getExperiences(locale),
  ]);

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <Section className="py-16 sm:py-24">
        {experiences.length === 0 ? (
          <p className="max-w-xl text-lg leading-8 text-muted-foreground">
            {t("empty")}
          </p>
        ) : (
          <ExperienceGrid
            experiences={experiences}
            locale={locale}
            headingLevel="h2"
          />
        )}
      </Section>
    </>
  );
}
