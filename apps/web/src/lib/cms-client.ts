import { env } from "@repo/env/web/server";

/**
 * Transport for the CMS's narrow, read-only public API. Server components
 * only. Requests time out rather than hanging a render, and cache tags let
 * the CMS invalidate published content within seconds. Each content type's
 * client (`cms-blog-client.ts`, `cms-experiences-client.ts`) validates the
 * responses against its shared Zod schema.
 */

const TIMEOUT_MS = 4000;
const REVALIDATE_SECONDS = 60;

export class CmsUnavailableError extends Error {
  constructor(readonly status: number | "timeout" | "network") {
    super(`CMS unavailable (${status})`);
    this.name = "CmsUnavailableError";
  }
}

type FetchOptions = {
  tags: string[];
  /** Draft preview reads bypass the cache and send the shared secret. */
  preview?: { id: string };
};

export async function cmsFetch(
  path: string,
  options: FetchOptions,
): Promise<unknown> {
  const url = `${env.CMS_INTERNAL_URL}${path}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const headers: Record<string, string> = {};
  const next: { revalidate: number | false; tags: string[] } = {
    revalidate: REVALIDATE_SECONDS,
    tags: options.tags,
  };

  if (options.preview) {
    if (!env.CMS_PREVIEW_SECRET) throw new CmsUnavailableError("network");
    headers["x-preview-secret"] = env.CMS_PREVIEW_SECRET;
    next.revalidate = false;
  }

  try {
    const response = await fetch(url, {
      headers,
      signal: controller.signal,
      next,
    });

    if (response.status === 404) return null;
    if (!response.ok) throw new CmsUnavailableError(response.status);
    return await response.json();
  } catch (error) {
    if (error instanceof CmsUnavailableError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new CmsUnavailableError("timeout");
    }
    throw new CmsUnavailableError("network");
  } finally {
    clearTimeout(timeout);
  }
}
