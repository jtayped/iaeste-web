import type { MetadataRoute } from "next";

const host = "https://iaestelleida.cat";
const locales = ["ca", "es", "en"];
const paths = ["", "/student", "/incommings"];

export default function sitemap(): MetadataRoute.Sitemap {
  const sitemapEntries = paths.flatMap((path) =>
    locales.map((locale) => {
      const url = `${host}/${locale}${path}`;
      const alternates = Object.fromEntries(
        locales.map((altLocale) => [altLocale, `${host}/${altLocale}${path}`])
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
    })
  );

  return sitemapEntries;
}
