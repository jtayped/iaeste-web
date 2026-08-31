import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { notFound } from "next/navigation";

import { BlogArticleBody } from "@/components/blog/blog-article-body";
import { Link } from "@/i18n/routing";
import {
  getBlogPost,
  getPostVersions,
  getStaticPostParams,
  type BlogLocale,
} from "@/lib/blog";

const host = "https://iaestelleida.cat";
const localeLabels: Record<BlogLocale, string> = {
  ca: "català",
  es: "castellà",
  en: "english",
};

// A new article must be routable without rebuilding the site, so dynamic
// params are allowed and nothing is pre-generated.
export const dynamicParams = true;

export function generateStaticParams() {
  return getStaticPostParams();
}

function formatDate(date: string, locale: BlogLocale) {
  return new Intl.DateTimeFormat(
    locale === "ca" ? "ca-ES" : locale === "es" ? "es-ES" : "en-GB",
    { day: "numeric", month: "long", year: "numeric" },
  ).format(new Date(`${date}T12:00:00Z`));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: BlogLocale; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = await getBlogPost(locale, slug);
  if (!post) return {};

  const versions = await getPostVersions(post.translationKey);
  const languages = Object.fromEntries(
    versions.map((version) => [
      version.locale,
      `${host}/${version.locale}/blog/${version.slug}`,
    ]),
  );
  const canonical = post.isFallback
    ? `${host}/ca/blog/${post.slug}`
    : `${host}/${locale}/blog/${post.slug}`;
  const image = new URL(post.coverImage, host).toString();

  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical, languages },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      url: canonical,
      publishedTime: post.publishDate,
      authors: [post.author],
      images: [{ url: image, alt: post.title }],
      siteName: "iaeste lc lleida",
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      images: [image],
    },
    robots: post.isFallback ? { index: false, follow: true } : undefined,
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ locale: BlogLocale; slug: string }>;
}) {
  const { locale, slug } = await params;
  const [post, t] = await Promise.all([
    getBlogPost(locale, slug),
    getTranslations({ locale, namespace: "BlogPage" }),
  ]);

  if (!post) notFound();

  const versions =
    post.alternates ?? (await getPostVersions(post.translationKey));

  return (
    <article>
      <header className="bg-primary pt-40 pb-20 text-primary-foreground sm:pt-48">
        <div className="section-padding mx-auto max-w-5xl">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm font-semibold underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-primary-foreground focus-visible:ring-offset-4 focus-visible:ring-offset-primary focus-visible:outline-none"
          >
            <ArrowLeft aria-hidden="true" size={17} />
            {t("back")}
          </Link>
          <h1 className="mt-10 max-w-4xl text-4xl leading-[1.02] font-bold tracking-[-0.04em] text-balance sm:text-6xl">
            {post.title}
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-primary-foreground/80">
            {post.excerpt}
          </p>
          <p className="mt-8 text-sm text-primary-foreground/75">
            {formatDate(post.publishDate, locale)} · {post.author}
          </p>
        </div>
      </header>

      <div className="section-padding mx-auto max-w-6xl pb-20 sm:pb-28">
        <div className="relative -mt-10 aspect-[16/9] overflow-hidden rounded-2xl shadow-[0_24px_70px_-36px_color-mix(in_oklab,var(--foreground)_65%,transparent)] sm:-mt-12">
          <Image
            src={post.coverImage}
            alt={post.title}
            fill
            priority
            sizes="(min-width: 1152px) 1152px, 100vw"
            className="object-cover"
          />
        </div>

        <div className="mx-auto mt-12 max-w-3xl sm:mt-16">
          {post.isFallback && (
            <aside className="mb-12 border-y py-5 text-sm leading-6 text-muted-foreground">
              {t("fallbackNotice")}
            </aside>
          )}

          {versions.length > 1 && (
            <nav
              aria-label={t("translationsLabel")}
              className="mb-12 flex flex-wrap items-center gap-3 border-b pb-6"
            >
              <span className="text-sm text-muted-foreground">
                {t("translationsLabel")}
              </span>
              {versions.map((version) => (
                <Link
                  key={version.locale}
                  href={`/blog/${version.slug}`}
                  locale={version.locale}
                  hrefLang={version.locale}
                  className="rounded-full border px-4 py-2 text-sm font-semibold transition-colors hover:bg-default focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
                >
                  {localeLabels[version.locale]}
                </Link>
              ))}
            </nav>
          )}

          <BlogArticleBody post={post} />

          <div className="mt-16 flex flex-wrap gap-2 border-t pt-7">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-default px-4 py-2 text-sm"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}
