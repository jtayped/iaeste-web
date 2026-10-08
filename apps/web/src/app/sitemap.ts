import type { MetadataRoute } from "next";

import { blogLocales } from "@/lib/blog";
import { fetchBlogSitemap } from "@/lib/cms-blog-client";
import { CmsUnavailableError } from "@/lib/cms-client";
import { getExperienceSitemap } from "@/lib/experiences";

const host = "https://iaestelleida.cat";
const paths = ["", "/student", "/company", "/incommings", "/blog"];

function staticEntries(paths: string[]): MetadataRoute.Sitemap {
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

/** The CMS sitemap endpoint already excludes fallback and draft URLs. */
async function postEntries(): Promise<MetadataRoute.Sitemap> {
  try {
    const { entries } = await fetchBlogSitemap();
    return entries.map((entry) => ({
      url: entry.url,
      lastModified: entry.lastModified.split("T")[0],
      changeFrequency: "monthly",
      priority: 0.7,
    }));
  } catch (error) {
    // A CMS blip (or build time, before it is reachable) drops the article
    // URLs from this pass rather than failing the whole sitemap.
    if (!(error instanceof CmsUnavailableError)) throw error;
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const experiences = await getExperienceSitemap();
  // The list page is only worth indexing once it has something on it.
  const listed = experiences.length > 0 ? [...paths, "/experiences"] : paths;

  return [
    ...staticEntries(listed),
    ...(await postEntries()),
    ...experiences.map((entry) => ({
      url: entry.url,
      lastModified: entry.lastModified.split("T")[0],
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
