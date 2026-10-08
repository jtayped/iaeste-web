import { createHmac } from "node:crypto";

import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
} from "payload";

import { env } from "@repo/env/cms/server";

const LOCALES = ["ca", "es", "en"] as const;

type RevalidatePayload = {
  documentId: string;
  slugs: string[];
  reason: "publish" | "unpublish" | "update" | "delete";
  requestId: string;
};

function collectSlugs(doc: unknown): string[] {
  if (!doc || typeof doc !== "object") return [];
  const record = doc as Record<string, unknown>;
  const out = new Set<string>();
  // Localized `slug` comes back either as a plain string (single-locale read)
  // or as a `{ ca, es, en }` map (all-locales read). Handle both.
  const slug = record.slug;
  if (typeof slug === "string" && slug) out.add(slug);
  else if (slug && typeof slug === "object") {
    for (const locale of LOCALES) {
      const value = (slug as Record<string, unknown>)[locale];
      if (typeof value === "string" && value) out.add(value);
    }
  }
  return [...out];
}

async function postRevalidation(body: RevalidatePayload): Promise<void> {
  const raw = JSON.stringify(body);
  const signature = createHmac("sha256", env.WEB_REVALIDATE_SECRET)
    .update(raw)
    .digest("hex");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);

  try {
    const response = await fetch(env.WEB_REVALIDATE_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-revalidate-signature": signature,
      },
      body: raw,
      signal: controller.signal,
    });

    if (!response.ok) {
      console.error("[cms] blog revalidation rejected", {
        documentId: body.documentId,
        requestId: body.requestId,
        status: response.status,
      });
    }
  } catch (error) {
    // A failed invalidation never rolls back the database write or shows the
    // editor a false failure. The 60s cache lifetime is the safety net.
    console.error("[cms] blog revalidation failed", {
      documentId: body.documentId,
      requestId: body.requestId,
      error: error instanceof Error ? error.message : "unknown error",
    });
  } finally {
    clearTimeout(timeout);
  }
}

export const revalidateOnChange: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  req,
}) => {
  const wasPublished = previousDoc?._status === "published";
  const isPublished = doc?._status === "published";

  // Draft autosaves (draft -> draft) change nothing the public site can see.
  if (!wasPublished && !isPublished) return doc;

  const reason: RevalidatePayload["reason"] = isPublished
    ? wasPublished
      ? "update"
      : "publish"
    : "unpublish";

  await postRevalidation({
    documentId: String(doc.id),
    slugs: [...new Set([...collectSlugs(previousDoc), ...collectSlugs(doc)])],
    reason,
    requestId: req.headers?.get?.("x-request-id") ?? crypto.randomUUID(),
  });

  return doc;
};

export const revalidateOnDelete: CollectionAfterDeleteHook = async ({
  doc,
  req,
}) => {
  if (doc?._status !== "published") return doc;

  await postRevalidation({
    documentId: String(doc.id),
    slugs: collectSlugs(doc),
    reason: "delete",
    requestId: req.headers?.get?.("x-request-id") ?? crypto.randomUUID(),
  });

  return doc;
};
