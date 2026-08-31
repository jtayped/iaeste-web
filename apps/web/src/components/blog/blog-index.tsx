import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { notFound } from "next/navigation";

import { Link } from "@/i18n/routing";
import {
  getBlogPosts,
  postsPerPage,
  type BlogLocale,
  type BlogPost,
} from "@/lib/blog";

function formatDate(date: string, locale: BlogLocale) {
  return new Intl.DateTimeFormat(
    locale === "ca" ? "ca-ES" : locale === "es" ? "es-ES" : "en-GB",
    { day: "numeric", month: "long", year: "numeric" },
  ).format(new Date(`${date}T12:00:00Z`));
}

function StatusLabels({
  post,
  draftLabel,
  fallbackLabel,
}: {
  post: BlogPost;
  draftLabel: string;
  fallbackLabel: string;
}) {
  return (
    <div className="flex flex-wrap gap-2 text-xs font-semibold lowercase">
      {post.isFallback && (
        <span className="rounded-full bg-secondary px-3 py-1 text-secondary-foreground">
          {fallbackLabel}
        </span>
      )}
      {post.draft && (
        <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-900">
          {draftLabel}
        </span>
      )}
    </div>
  );
}

function FeaturedPost({
  post,
  readLabel,
  draftLabel,
  fallbackLabel,
}: {
  post: BlogPost;
  readLabel: string;
  draftLabel: string;
  fallbackLabel: string;
}) {
  return (
    <article className="grid items-stretch overflow-hidden rounded-2xl bg-background text-foreground shadow-[0_24px_70px_-32px_color-mix(in_oklab,var(--foreground)_55%,transparent)] lg:grid-cols-[1.15fr_0.85fr]">
      <div className="relative min-h-72 lg:min-h-[30rem]">
        <Image
          src={post.coverImage}
          alt={post.title}
          fill
          priority
          sizes="(min-width: 1024px) 58vw, 100vw"
          className="object-cover"
        />
      </div>
      <div className="flex flex-col justify-between p-7 sm:p-10 lg:p-12">
        <div>
          <StatusLabels
            post={post}
            draftLabel={draftLabel}
            fallbackLabel={fallbackLabel}
          />
          <p className="mt-6 text-sm text-muted-foreground">
            {formatDate(post.publishDate, post.requestedLocale)} · {post.author}
          </p>
          <h2 className="mt-4 max-w-xl text-3xl leading-tight font-bold tracking-[-0.03em] text-balance sm:text-4xl">
            {post.title}
          </h2>
          <p className="mt-5 max-w-prose leading-7 text-muted-foreground">
            {post.excerpt}
          </p>
        </div>
        <Link
          href={`/blog/${post.slug}`}
          className="mt-10 inline-flex w-fit items-center gap-3 font-semibold text-primary underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:outline-none"
        >
          {readLabel}
          <ArrowRight aria-hidden="true" size={18} />
        </Link>
      </div>
    </article>
  );
}

function PostRow({
  post,
  readLabel,
  draftLabel,
  fallbackLabel,
}: {
  post: BlogPost;
  readLabel: string;
  draftLabel: string;
  fallbackLabel: string;
}) {
  return (
    <article className="grid gap-6 border-t py-9 md:grid-cols-[12rem_1fr_auto] md:items-center">
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl">
        <Image
          src={post.coverImage}
          alt=""
          fill
          sizes="(min-width: 768px) 192px, 100vw"
          className="object-cover transition-transform duration-500 hover:scale-[1.03]"
        />
      </div>
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-muted-foreground">
            {formatDate(post.publishDate, post.requestedLocale)}
          </p>
          <StatusLabels
            post={post}
            draftLabel={draftLabel}
            fallbackLabel={fallbackLabel}
          />
        </div>
        <h2 className="mt-3 text-2xl font-bold tracking-[-0.025em] text-balance">
          {post.title}
        </h2>
        <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">
          {post.excerpt}
        </p>
      </div>
      <Link
        href={`/blog/${post.slug}`}
        aria-label={`${readLabel}: ${post.title}`}
        className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:outline-none"
      >
        <ArrowRight aria-hidden="true" size={18} />
      </Link>
    </article>
  );
}

export default async function BlogIndex({
  locale,
  page,
}: {
  locale: BlogLocale;
  page: number;
}) {
  const t = await getTranslations({ locale, namespace: "BlogPage" });
  const posts = await getBlogPosts(locale);
  const pageCount = Math.max(1, Math.ceil(posts.length / postsPerPage));

  if (!Number.isInteger(page) || page < 1 || page > pageCount) notFound();

  const pagePosts = posts.slice((page - 1) * postsPerPage, page * postsPerPage);
  const featuredPost = page === 1 ? pagePosts[0] : undefined;
  const remainingPosts = featuredPost ? pagePosts.slice(1) : pagePosts;

  return (
    <>
      <section className="bg-primary pt-40 pb-16 text-primary-foreground sm:pt-48 sm:pb-24">
        <div className="section-padding mx-auto max-w-7xl">
          <h1 className="max-w-4xl text-5xl leading-[0.98] font-bold tracking-[-0.04em] text-balance sm:text-6xl lg:text-7xl">
            {t("title")}
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-primary-foreground/80">
            {t("description")}
          </p>
          {featuredPost && (
            <div className="mt-12 sm:mt-16">
              <FeaturedPost
                post={featuredPost}
                readLabel={t("readArticle")}
                draftLabel={t("draftLabel")}
                fallbackLabel={t("fallbackLabel")}
              />
            </div>
          )}
        </div>
      </section>

      <section className="section-padding mx-auto max-w-7xl py-16 sm:py-24">
        {posts.length === 0 ? (
          <p className="max-w-xl text-lg leading-8 text-muted-foreground">
            {t("empty")}
          </p>
        ) : (
          <div>
            {remainingPosts.map((post) => (
              <PostRow
                key={`${post.locale}:${post.slug}`}
                post={post}
                readLabel={t("readArticle")}
                draftLabel={t("draftLabel")}
                fallbackLabel={t("fallbackLabel")}
              />
            ))}
          </div>
        )}

        {pageCount > 1 && (
          <nav
            aria-label={t("paginationLabel")}
            className="mt-12 flex items-center gap-3 border-t pt-8"
          >
            {Array.from({ length: pageCount }, (_, index) => {
              const pageNumber = index + 1;
              const href =
                pageNumber === 1 ? "/blog" : `/blog/page/${pageNumber}`;
              return (
                <Link
                  key={pageNumber}
                  href={href}
                  aria-current={pageNumber === page ? "page" : undefined}
                  className="inline-flex h-11 min-w-11 items-center justify-center rounded-full border px-4 text-sm font-semibold transition-colors hover:bg-default aria-[current=page]:border-primary aria-[current=page]:bg-primary aria-[current=page]:text-primary-foreground"
                >
                  {pageNumber}
                </Link>
              );
            })}
          </nav>
        )}
      </section>
    </>
  );
}
