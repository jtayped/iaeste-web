import type { MetadataRoute } from "next";

import { fetchBlogSitemap } from "@/lib/cms-blog-client";
import { blogLocales } from "@/lib/blog";

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

/** The CMS sitemap endpoint already excludes fallback and draft URLs. */
async function postEntries(): Promise<MetadataRoute.Sitemap> {
  const { entries } = await fetchBlogSitemap();
  return entries.map((entry) => ({
    url: entry.url,
    lastModified: entry.lastModified.split("T")[0],
    changeFrequency: "monthly",
    priority: 0.7,
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return [...staticEntries(), ...(await postEntries())];
}
