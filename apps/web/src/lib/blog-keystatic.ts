import type { Config } from "@keystatic/core";
import { createReader, type Reader } from "@keystatic/core/reader";
import { isProduction } from "@repo/env/web/client";

import keystaticConfig from "../../../../keystatic.config";
import {
  blogLocales,
  postsPerPage,
  type BlogLocale,
  type BlogPost,
  type BlogPostVersion,
  type MarkdocBody,
} from "./blog-types";
import { repoRoot } from "./repo-root";

type KeystaticReader =
  typeof keystaticConfig extends Config<infer Collections, infer Singletons>
    ? Reader<Collections, Singletons>
    : never;

const reader: KeystaticReader = createReader(repoRoot, keystaticConfig);

type PostEntry = NonNullable<
  Awaited<ReturnType<typeof reader.collections.postsCa.read>>
>;

function readCollection(locale: BlogLocale) {
  switch (locale) {
    case "ca":
      return reader.collections.postsCa.all();
    case "es":
      return reader.collections.postsEs.all();
    case "en":
      return reader.collections.postsEn.all();
  }
}

function readEntry(locale: BlogLocale, slug: string) {
  switch (locale) {
    case "ca":
      return reader.collections.postsCa.read(slug);
    case "es":
      return reader.collections.postsEs.read(slug);
    case "en":
      return reader.collections.postsEn.read(slug);
  }
}

function canShow(entry: PostEntry, includeDrafts: boolean) {
  return includeDrafts || !entry.draft;
}

function toBlogPost(
  slug: string,
  entry: PostEntry,
  locale: BlogLocale,
  requestedLocale: BlogLocale,
): BlogPost {
  if (typeof entry.body !== "function") {
    throw new Error(`expected unresolved Markdoc body for ${slug}`);
  }

  return {
    translationKey: entry.translationKey,
    slug,
    locale,
    requestedLocale,
    isFallback: locale !== requestedLocale,
    draft: entry.draft,
    title: entry.title,
    excerpt: entry.excerpt,
    author: entry.author,
    publishDate: entry.publishDate,
    tags: [...entry.tags],
    coverImage: entry.coverImage,
    coverImageMeta: null,
    body: entry.body as MarkdocBody,
    bodyLexical: null,
    alternates: null,
  };
}

export async function getPostsInLocale(
  locale: BlogLocale,
  { includeDrafts = false }: { includeDrafts?: boolean } = {},
) {
  const entries = await readCollection(locale);

  return entries
    .filter(({ entry }) => canShow(entry, includeDrafts))
    .map(({ slug, entry }) => toBlogPost(slug, entry, locale, locale))
    .sort((a, b) => b.publishDate.localeCompare(a.publishDate));
}

export async function getBlogPosts(
  locale: BlogLocale,
  { includeDrafts = !isProduction }: { includeDrafts?: boolean } = {},
) {
  const localPosts = await getPostsInLocale(locale, { includeDrafts });

  if (locale === "ca") return localPosts;

  const localTranslationKeys = new Set(
    localPosts.map((post) => post.translationKey),
  );
  const catalanPosts = await getPostsInLocale("ca", { includeDrafts });
  const fallbackPosts = catalanPosts
    .filter((post) => !localTranslationKeys.has(post.translationKey))
    .map((post) => ({
      ...post,
      requestedLocale: locale,
      isFallback: true,
    }));

  return [...localPosts, ...fallbackPosts].sort((a, b) =>
    b.publishDate.localeCompare(a.publishDate),
  );
}

export async function getBlogPost(
  requestedLocale: BlogLocale,
  slug: string,
  { includeDrafts = !isProduction }: { includeDrafts?: boolean } = {},
) {
  const localEntry = await readEntry(requestedLocale, slug);

  if (localEntry && canShow(localEntry, includeDrafts)) {
    return toBlogPost(slug, localEntry, requestedLocale, requestedLocale);
  }

  if (requestedLocale === "ca") return null;

  const catalanEntry = await readEntry("ca", slug);
  if (!catalanEntry || !canShow(catalanEntry, includeDrafts)) return null;

  const localPosts = await getPostsInLocale(requestedLocale, { includeDrafts });
  const hasTranslation = localPosts.some(
    (post) => post.translationKey === catalanEntry.translationKey,
  );

  if (hasTranslation) return null;

  return toBlogPost(slug, catalanEntry, "ca", requestedLocale);
}

export async function getPostVersions(
  translationKey: string,
): Promise<BlogPostVersion[]> {
  const versions = await Promise.all(
    blogLocales.map(async (locale) => {
      const posts = await getPostsInLocale(locale);
      const post = posts.find(
        (entry) => entry.translationKey === translationKey,
      );
      return post
        ? ({ locale, slug: post.slug } satisfies BlogPostVersion)
        : null;
    }),
  );

  return versions.filter(
    (version): version is BlogPostVersion => version !== null,
  );
}

export async function getStaticPostParams() {
  const params = await Promise.all(
    blogLocales.map(async (locale) => {
      const posts = await getBlogPosts(locale);
      return posts.map((post) => ({ locale, slug: post.slug }));
    }),
  );

  return params.flat();
}

export async function getStaticPaginationParams() {
  const params = await Promise.all(
    blogLocales.map(async (locale) => {
      const posts = await getBlogPosts(locale);
      const pageCount = Math.ceil(posts.length / postsPerPage);
      return Array.from({ length: Math.max(0, pageCount - 1) }, (_, index) => ({
        locale,
        page: String(index + 2),
      }));
    }),
  );

  return params.flat();
}
