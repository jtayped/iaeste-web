import type { MetadataRoute } from "next";

import { env } from "@repo/env/web/server";

import { fetchBlogSitemap } from "@/lib/cms-blog-client";
import { blogLocales, getPostsInLocale } from "@/lib/blog";

const host = "https://iaestelleida.cat";
const paths = ["", "/student", "/incommings", "/blog"];

function staticEntries(): MetadataRoute.Sitemap {
  return paths.flatMap((path) =>
    blogLocales.map((locale) => {
      const url = `${host}/${locale}${path}`;
      const alternates = Object.fromEntries(
        blogLocales.map((altLocale) => [
          altLocale,
          `${host}/${altLocale}${path}`,
        ]),
      );

      return {
        url,
        lastModified: new Date().toISOString().split("T")[0],
        alternates: { languages: alternates },
        changeFrequency: path === "" ? "weekly" : "monthly",
        priority: path === "" ? 1.0 : 0.8,
      } satisfies MetadataRoute.Sitemap[0];
    }),
  );
}

/** Keystatic path: match translations by translationKey across locale files. */
async function keystaticPostEntries(): Promise<MetadataRoute.Sitemap> {
  const postsByLocale = await Promise.all(
    blogLocales.map(async (locale) => ({
      locale,
      posts: await getPostsInLocale(locale),
    })),
  );
  const allPosts = postsByLocale.flatMap(({ locale, posts }) =>
    posts.map((post) => ({ ...post, locale })),
  );

  return allPosts.map((post) => {
    const translations = allPosts.filter(
      (candidate) => candidate.translationKey === post.translationKey,
    );
    return {
      url: `${host}/${post.locale}/blog/${post.slug}`,
      lastModified: post.publishDate,
      alternates: {
        languages: Object.fromEntries(
          translations.map((translation) => [
            translation.locale,
            `${host}/${translation.locale}/blog/${translation.slug}`,
          ]),
        ),
      },
      changeFrequency: "monthly",
      priority: 0.7,
    } satisfies MetadataRoute.Sitemap[0];
  });
}

/** CMS path: the sitemap endpoint already excludes fallback and draft URLs. */
async function payloadPostEntries(): Promise<MetadataRoute.Sitemap> {
  const { entries } = await fetchBlogSitemap();
  return entries.map((entry) => ({
    url: entry.url,
    lastModified: entry.lastModified.split("T")[0],
    changeFrequency: "monthly",
    priority: 0.7,
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const postEntries =
    env.BLOG_SOURCE === "payload"
      ? await payloadPostEntries()
      : await keystaticPostEntries();

  return [...staticEntries(), ...postEntries];
}
