import type { MetadataRoute } from "next";

import { blogLocales, getPostsInLocale } from "@/lib/blog";

const host = "https://iaestelleida.cat";
const paths = ["", "/student", "/incommings", "/blog"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const sitemapEntries = paths.flatMap((path) =>
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
        lastModified: new Date().toISOString().split("T")[0], // Use date without time
        alternates: {
          languages: alternates,
        },
        changeFrequency: path === "" ? "weekly" : "monthly", // More specific change frequency
        priority: path === "" ? 1.0 : 0.8, // Prioritize homepage
      } satisfies MetadataRoute.Sitemap[0];
    }),
  );

  const postsByLocale = await Promise.all(
    blogLocales.map(async (locale) => ({
      locale,
      posts: await getPostsInLocale(locale),
    })),
  );
  const allPosts = postsByLocale.flatMap(({ locale, posts }) =>
    posts.map((post) => ({ ...post, locale })),
  );
  const postEntries = allPosts.map((post) => {
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

  return [...sitemapEntries, ...postEntries];
}
