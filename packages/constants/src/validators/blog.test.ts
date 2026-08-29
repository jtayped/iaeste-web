import assert from "node:assert/strict";
import { test } from "node:test";

import {
  BLOG_LIST_DEFAULT_LIMIT,
  BLOG_LIST_MAX_LIMIT,
  blogDetailQuerySchema,
  blogListQuerySchema,
  blogListResponseSchema,
  blogPostDetailSchema,
  blogPostSummarySchema,
} from "./blog";

const summary = {
  id: "1",
  requestedLocale: "es",
  contentLocale: "ca",
  isFallback: true,
  slug: "un-article",
  title: "Un article",
  excerpt: "resum",
  author: "iaeste lc lleida",
  publishDate: "2026-01-02T00:00:00.000Z",
  tags: [{ key: "beca", label: "beca" }],
  coverImage: {
    alt: "text",
    original: {
      url: "https://cms.example.com/a.jpg",
      width: 1600,
      height: 900,
    },
    card: {
      url: "https://cms.example.com/a-card.webp",
      width: 800,
      height: 450,
    },
    hero: null,
  },
};

test("list query applies defaults and coerces strings", () => {
  const parsed = blogListQuerySchema.parse({});
  assert.equal(parsed.locale, "ca");
  assert.equal(parsed.page, 1);
  assert.equal(parsed.limit, BLOG_LIST_DEFAULT_LIMIT);

  const coerced = blogListQuerySchema.parse({ page: "3", limit: "12" });
  assert.equal(coerced.page, 3);
  assert.equal(coerced.limit, 12);
});

test("list query rejects out-of-range and unknown locale", () => {
  assert.throws(() =>
    blogListQuerySchema.parse({ limit: BLOG_LIST_MAX_LIMIT + 1 }),
  );
  assert.throws(() => blogListQuerySchema.parse({ page: 0 }));
  assert.throws(() => blogListQuerySchema.parse({ locale: "fr" }));
  assert.throws(() => blogDetailQuerySchema.parse({ locale: "de" }));
});

test("post summary accepts a fallback record with a null hero", () => {
  const parsed = blogPostSummarySchema.parse(summary);
  assert.equal(parsed.isFallback, true);
  assert.equal(parsed.coverImage?.hero, null);
});

test("post detail requires a lexical root envelope", () => {
  assert.throws(() =>
    blogPostDetailSchema.parse({ ...summary, body: {}, alternates: [] }),
  );

  const ok = blogPostDetailSchema.parse({
    ...summary,
    body: { root: { type: "root", children: [] } },
    alternates: [{ locale: "ca", slug: "un-article" }],
  });
  assert.equal(ok.alternates[0]?.locale, "ca");
});

test("list response counts are non-negative integers", () => {
  assert.throws(() =>
    blogListResponseSchema.parse({
      items: [],
      page: 1,
      limit: 6,
      totalItems: -1,
      totalPages: 0,
    }),
  );
});
