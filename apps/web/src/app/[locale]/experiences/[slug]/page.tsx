import { cn } from "@repo/ui/lib/utils";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { notFound } from "next/navigation";

import { LexicalContent } from "@/components/blog/lexical-content";
import Section from "@/components/common/sections/section";
import {
  ExperienceFacts,
  getExperienceFacts,
} from "@/components/experiences/experience-facts";
import { ExperienceGallery } from "@/components/experiences/experience-gallery";
import { ExperienceGrid } from "@/components/experiences/experience-grid";
import { quoted } from "@/components/experiences/format";
import { Link } from "@/i18n/routing";
import type { BlogLocale } from "@/lib/blog";
import { getExperience, getExperiences } from "@/lib/experiences";

const host = "https://iaestelleida.cat";
const localeLabels: Record<BlogLocale, string> = {
  ca: "català",
  es: "castellà",
  en: "english",
};
const moreCount = 3;

// A new experience must be routable without rebuilding the site, so dynamic
// params are allowed and nothing is pre-generated.
export const dynamicParams = true;

export function generateStaticParams(): { locale: BlogLocale; slug: string }[] {
  return [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: BlogLocale; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const experience = await getExperience(locale, slug);
  if (!experience) return {};

  const languages = Object.fromEntries(
    experience.alternates.map((version) => [
      version.locale,
      `${host}/${version.locale}/experiences/${version.slug}`,
    ]),
  );
  const canonical = experience.isFallback
    ? `${host}/ca/experiences/${experience.slug}`
    : `${host}/${locale}/experiences/${experience.slug}`;
  const photo = experience.photo;
  const image = photo ? (photo.hero ?? photo.original) : null;

  return {
    title: experience.title,
    description: experience.quote,
    alternates: { canonical, languages },
    openGraph: {
      title: experience.title,
      description: experience.quote,
      type: "article",
      url: canonical,
      publishedTime: experience.publishDate,
      images:
        photo && image
          ? [
              {
                url: image.url,
                width: image.width,
                height: image.height,
                alt: photo.alt,
              },
            ]
          : undefined,
      siteName: "iaeste lc lleida",
    },
    twitter: {
      card: "summary_large_image",
      title: experience.title,
      description: experience.quote,
      images: image ? [image.url] : undefined,
    },
    robots: experience.isFallback ? { index: false, follow: true } : undefined,
  };
}

export default async function ExperiencePage({
  params,
}: {
  params: Promise<{ locale: BlogLocale; slug: string }>;
}) {
  const { locale, slug } = await params;
  const [experience, latest, t] = await Promise.all([
    getExperience(locale, slug),
    // One extra, in case the current experience is among the latest.
    getExperiences(locale, { limit: moreCount + 1 }),
    getTranslations({ locale, namespace: "ExperiencesPage" }),
  ]);

  if (!experience) notFound();

  const facts = await getExperienceFacts(experience, locale);
  const more = latest
    .filter((other) => other.id !== experience.id)
    .slice(0, moreCount);
  const content = experience.contentLocale;
  const caption = experience.role ?? experience.degree;
  const photo = experience.photo;
  const hero = photo ? (photo.hero ?? photo.original) : null;
  const hasFacts = facts.length > 0;

  return (
    <>
      <article>
        <header className="section-padding bg-primary pt-36 pb-20 text-primary-foreground sm:pt-44">
          <div className="mx-auto max-w-5xl">
            <Link
              href="/experiences"
              className="inline-flex items-center gap-2 text-sm font-semibold underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-primary-foreground focus-visible:ring-offset-4 focus-visible:ring-offset-primary focus-visible:outline-none"
            >
              <ArrowLeft aria-hidden="true" size={17} />
              {t("back")}
            </Link>
            <h1
              lang={content}
              className="mt-10 max-w-4xl text-4xl leading-[1.05] font-extrabold tracking-[-0.03em] text-balance sm:text-5xl lg:text-6xl"
            >
              {experience.title}
            </h1>
            <p className="mt-7 text-lg leading-8">
              <span className="font-semibold">{experience.studentName}</span>
              {caption && (
                <span
                  lang={content}
                  className="block text-primary-foreground/80"
                >
                  {caption}
                </span>
              )}
            </p>
            {experience.isFallback && (
              <p className="mt-6">
                <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground lowercase">
                  {t("fallbackLabel")}
                </span>
              </p>
            )}
          </div>
        </header>

        <div className="section-padding mx-auto max-w-7xl pb-20 sm:pb-28">
          {photo && hero && (
            <div className="relative -mt-10 aspect-[16/9] overflow-hidden rounded-2xl bg-default shadow-[0_24px_70px_-36px_color-mix(in_oklab,var(--foreground)_65%,transparent)] sm:-mt-12">
              <Image
                src={hero.url}
                alt={photo.alt}
                fill
                priority
                sizes="(min-width: 1280px) 1152px, 100vw"
                className="object-cover"
              />
            </div>
          )}

          <div
            className={cn(
              "mx-auto mt-12 grid max-w-5xl gap-12 sm:mt-16",
              // `auto 1fr` rows keep the quote snug above the body when the
              // facts column, which spans both rows, is the taller side.
              hasFacts &&
                "md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:grid-rows-[auto_1fr] md:gap-x-16",
            )}
          >
            <div className={cn(hasFacts && "md:col-start-2")}>
              {experience.isFallback && (
                <aside className="mb-12 border-y py-5 text-sm leading-6 text-muted-foreground">
                  {t("fallbackNotice")}
                </aside>
              )}

              {experience.alternates.length > 1 && (
                <nav
                  aria-label={t("translationsLabel")}
                  className="mb-12 flex flex-wrap items-center gap-3 border-b pb-6"
                >
                  <span className="text-sm text-muted-foreground">
                    {t("translationsLabel")}
                  </span>
                  {experience.alternates.map((version) => (
                    <Link
                      key={version.locale}
                      href={`/experiences/${version.slug}`}
                      locale={version.locale}
                      hrefLang={version.locale}
                      className="rounded-full border px-4 py-2 text-sm font-semibold transition-colors hover:bg-default focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
                    >
                      {localeLabels[version.locale]}
                    </Link>
                  ))}
                </nav>
              )}

              <blockquote
                lang={content}
                className="text-2xl leading-snug font-bold tracking-[-0.02em] text-pretty text-primary sm:text-3xl"
              >
                <p>{quoted(experience.quote, content)}</p>
              </blockquote>
            </div>

            {hasFacts && (
              <ExperienceFacts
                title={t("factsTitle")}
                facts={facts}
                className="md:sticky md:top-32 md:col-start-1 md:row-span-2 md:row-start-1 md:self-start"
              />
            )}

            <div lang={content} className={cn(hasFacts && "md:col-start-2")}>
              <LexicalContent data={experience.body} />
            </div>
          </div>

          <ExperienceGallery
            title={t("galleryTitle")}
            images={experience.gallery}
            className="mx-auto mt-16 max-w-5xl sm:mt-20"
          />
        </div>
      </article>

      {more.length > 0 && (
        <Section
          aria-labelledby="more-experiences"
          className="border-t bg-default/50 py-16 sm:py-24"
        >
          <h2
            id="more-experiences"
            className="text-3xl leading-tight font-bold tracking-[-0.03em] text-balance"
          >
            {t("moreTitle")}
          </h2>
          <ExperienceGrid
            experiences={more}
            locale={locale}
            headingLevel="h3"
            className="mt-10"
          />
        </Section>
      )}
    </>
  );
}
