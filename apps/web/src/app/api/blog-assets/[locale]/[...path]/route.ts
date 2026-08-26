import { readFile } from "node:fs/promises";
import path from "node:path";

import { blogLocales, type BlogLocale } from "@/lib/blog";
import { repoRoot } from "@/lib/repo-root";

const contentTypes: Record<string, string> = {
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ locale: string; path: string[] }> },
) {
  const { locale, path: pathSegments } = await params;

  if (!blogLocales.includes(locale as BlogLocale)) {
    return new Response(null, { status: 404 });
  }

  if (
    pathSegments.length === 0 ||
    pathSegments.some((segment) => segment !== path.basename(segment))
  ) {
    return new Response(null, { status: 404 });
  }

  const localeRoot = path.join(repoRoot, "content", "blog", locale);
  const assetPath = path.join(localeRoot, ...pathSegments);
  const extension = path.extname(assetPath).toLowerCase();
  const contentType = contentTypes[extension];

  if (!contentType || !assetPath.startsWith(`${localeRoot}${path.sep}`)) {
    return new Response(null, { status: 404 });
  }

  try {
    const file = await readFile(assetPath);
    return new Response(new Uint8Array(file), {
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Type": contentType,
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
