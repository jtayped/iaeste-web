import assert from "node:assert/strict";
import { test } from "node:test";

import {
  EXPERIENCE_LIST_DEFAULT_LIMIT,
  EXPERIENCE_LIST_MAX_LIMIT,
  experienceDetailQuerySchema,
  experienceDetailSchema,
  experienceListQuerySchema,
  experienceListResponseSchema,
  experienceSummarySchema,
} from "./experiences";

const photo = {
  alt: "la marta davant del laboratori",
  original: {
    url: "https://cms.example.com/marta.jpg",
    width: 1600,
    height: 2000,
  },
  card: {
    url: "https://cms.example.com/marta-card.webp",
    width: 800,
    height: 450,
  },
  hero: null,
};

const summary = {
  id: "7",
  requestedLocale: "en",
  contentLocale: "ca",
  isFallback: true,
  slug: "sis-mesos-a-munic",
  title: "sis mesos a munic",
  studentName: "marta p.",
  degree: "grau en enginyeria mecànica",
  role: null,
  country: "DE",
  city: "munic",
  hostCompany: null,
  startDate: "2025-03",
  endDate: "2025-08",
  quote: "vaig aprendre més en sis mesos que en dos anys de classe.",
  photo,
  publishDate: "2026-01-02T00:00:00.000Z",
  featured: true,
};

test("list query applies defaults and parses the featured flag", () => {
  const parsed = experienceListQuerySchema.parse({});
  assert.equal(parsed.locale, "ca");
  assert.equal(parsed.page, 1);
  assert.equal(parsed.limit, EXPERIENCE_LIST_DEFAULT_LIMIT);
  assert.equal(parsed.featured, undefined);

  assert.equal(
    experienceListQuerySchema.parse({ featured: "true" }).featured,
    true,
  );
  // A plain boolean coercion would read the string "false" as true.
  assert.equal(
    experienceListQuerySchema.parse({ featured: "false" }).featured,
    false,
  );
});

test("list query rejects out-of-range values and unknown locales", () => {
  assert.throws(() =>
    experienceListQuerySchema.parse({ limit: EXPERIENCE_LIST_MAX_LIMIT + 1 }),
  );
  assert.throws(() => experienceListQuerySchema.parse({ page: 0 }));
  assert.throws(() => experienceListQuerySchema.parse({ featured: "maybe" }));
  assert.throws(() => experienceDetailQuerySchema.parse({ locale: "fr" }));
});

test("summary accepts a fallback record with empty optional fields", () => {
  const parsed = experienceSummarySchema.parse(summary);
  assert.equal(parsed.isFallback, true);
  assert.equal(parsed.role, null);
  assert.equal(parsed.photo?.hero, null);
});

test("summary rejects a country name or a full date", () => {
  assert.throws(() =>
    experienceSummarySchema.parse({ ...summary, country: "Germany" }),
  );
  assert.throws(() =>
    experienceSummarySchema.parse({ ...summary, startDate: "2025-03-01" }),
  );
  assert.throws(() =>
    experienceSummarySchema.parse({ ...summary, endDate: "2025-13" }),
  );
});

test("detail requires a lexical root and carries the gallery", () => {
  assert.throws(() =>
    experienceDetailSchema.parse({
      ...summary,
      body: {},
      gallery: [],
      alternates: [],
    }),
  );

  const ok = experienceDetailSchema.parse({
    ...summary,
    body: { root: { type: "root", children: [] } },
    gallery: [photo, photo],
    alternates: [{ locale: "ca", slug: "sis-mesos-a-munic" }],
  });
  assert.equal(ok.gallery.length, 2);
  assert.equal(ok.alternates[0]?.locale, "ca");
});

test("list response counts are non-negative integers", () => {
  assert.throws(() =>
    experienceListResponseSchema.parse({
      items: [],
      page: 1,
      limit: 12,
      totalItems: -1,
      totalPages: 0,
    }),
  );
});
