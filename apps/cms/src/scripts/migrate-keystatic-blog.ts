import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import config from "@payload-config";
import {
  convertMarkdownToLexical,
  editorConfigFactory,
} from "@payloadcms/richtext-lexical";
import matter from "gray-matter";
import { getPayload } from "payload";
import { z } from "zod";

import { postBodyEditor } from "../lib/lexical";
import { slugify } from "../lib/slug";

/**
 * Idempotent migration of the Keystatic Markdown blog into Payload. Also the
 * rollback-safe record of how the old fields map. Reads `content/blog/<locale>`
 * from the repository directly — never through a deployed site — hashes each
 * image so it uploads once, converts the body with the exact posts-collection
 * editor, and skips a translation group that already carries its
 * `legacyTranslationKey`.
 *
 *   npm run --workspace cms migrate:blog
 */

const dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(dirname, "../../../..");
const LOCALES = ["ca", "es", "en"] as const;
type Locale = (typeof LOCALES)[number];

const frontmatterSchema = z.object({
  title: z.string().min(1),
  publishDate: z.union([z.string(), z.date()]).transform((v) => String(v)),
  author: z.string().min(1),
  excerpt: z.string().min(1).max(240),
  coverImage: z.string().min(1),
  tags: z.array(z.string().min(1)).default([]),
  draft: z.boolean().default(true),
  translationKey: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
});

type SourceDoc = z.infer<typeof frontmatterSchema> & {
  locale: Locale;
  slug: string;
  bodyMarkdown: string;
  coverImageAbsPath: string;
};

type Report = { created: string[]; skipped: string[]; failed: string[] };

async function readLocaleDocs(locale: Locale): Promise<SourceDoc[]> {
  const dir = path.join(REPO_ROOT, "content", "blog", locale);
  let names: string[];
  try {
    names = await readdir(dir);
  } catch {
    return [];
  }

  const docs: SourceDoc[] = [];
  for (const name of names) {
    if (!name.endsWith(".md")) continue;
    const filePath = path.join(dir, name);
    const raw = await readFile(filePath, "utf8");
    const { data, content } = matter(raw);
    const parsed = frontmatterSchema.safeParse(data);
    if (!parsed.success) {
      throw new Error(
        `frontmatter no vàlid a ${locale}/${name}: ${parsed.error.message}`,
      );
    }
    docs.push({
      ...parsed.data,
      locale,
      slug: name.replace(/\.md$/, ""),
      bodyMarkdown: content.trim(),
      coverImageAbsPath: path.join(dir, path.basename(parsed.data.coverImage)),
    });
  }
  return docs;
}

async function sha256(filePath: string): Promise<string> {
  return createHash("sha256")
    .update(await readFile(filePath))
    .digest("hex");
}

async function readSourceNote(imagePath: string): Promise<string | undefined> {
  const sidecar = imagePath.replace(/\.[^.]+$/, ".txt");
  try {
    return (await readFile(sidecar, "utf8")).trim() || undefined;
  } catch {
    return undefined;
  }
}

async function main() {
  const payload = await getPayload({ config });
  const editorConfig = await editorConfigFactory.fromEditor({
    config: payload.config,
    editor: postBodyEditor,
  });

  const report: Report = { created: [], skipped: [], failed: [] };
  const mediaByHash = new Map<string, string>();
  const tagByKey = new Map<string, string>();

  const groups = new Map<string, SourceDoc[]>();
  for (const locale of LOCALES) {
    for (const doc of await readLocaleDocs(locale)) {
      const list = groups.get(doc.translationKey) ?? [];
      list.push(doc);
      groups.set(doc.translationKey, list);
    }
  }

  for (const [key, docs] of groups) {
    try {
      // Shared fields must not conflict across a translation group.
      const authors = new Set(docs.map((d) => d.author));
      const dates = new Set(docs.map((d) => d.publishDate.slice(0, 10)));
      if (authors.size > 1 || dates.size > 1) {
        throw new Error(
          `camps compartits en conflicte per "${key}" (autoria o data)`,
        );
      }

      const existing = await payload.find({
        collection: "posts",
        where: { legacyTranslationKey: { equals: key } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      });
      if (existing.totalDocs > 0) {
        report.skipped.push(key);
        continue;
      }

      const anyPublished = docs.some((d) => !d.draft);
      const ordered = [...docs].sort(
        (a, b) => LOCALES.indexOf(a.locale) - LOCALES.indexOf(b.locale),
      );

      let postId: string | number | undefined;
      for (const doc of ordered) {
        // One upload per unique image.
        const hash = await sha256(doc.coverImageAbsPath);
        let mediaId = mediaByHash.get(hash);
        if (!mediaId) {
          const created = await payload.create({
            collection: "media",
            locale: doc.locale,
            data: {
              alt: doc.title,
              sourceNote: await readSourceNote(doc.coverImageAbsPath),
            },
            filePath: doc.coverImageAbsPath,
            overrideAccess: true,
          });
          mediaId = String(created.id);
          mediaByHash.set(hash, mediaId);
        }

        // Upsert the tag docs for this locale.
        const tagIds: string[] = [];
        for (const label of doc.tags) {
          const tagKey = slugify(label);
          let tagId = tagByKey.get(tagKey);
          if (!tagId) {
            const found = await payload.find({
              collection: "tags",
              where: { key: { equals: tagKey } },
              limit: 1,
              depth: 0,
              overrideAccess: true,
            });
            tagId = found.docs[0]
              ? String(found.docs[0].id)
              : String(
                  (
                    await payload.create({
                      collection: "tags",
                      locale: doc.locale,
                      data: { key: tagKey, label },
                      overrideAccess: true,
                    })
                  ).id,
                );
            tagByKey.set(tagKey, tagId);
          }
          tagIds.push(tagId);
        }

        const body = convertMarkdownToLexical({
          editorConfig,
          markdown: doc.bodyMarkdown,
        });

        const data = {
          title: doc.title,
          slug: doc.slug,
          excerpt: doc.excerpt,
          body,
          coverImage: mediaId,
          tags: tagIds,
          author: doc.author,
          publishDate: doc.publishDate,
          legacyTranslationKey: key,
        };

        if (postId == null) {
          const post = await payload.create({
            collection: "posts",
            locale: doc.locale,
            data,
            draft: !anyPublished,
            overrideAccess: true,
          });
          postId = post.id;
        } else {
          await payload.update({
            collection: "posts",
            id: postId,
            locale: doc.locale,
            data,
            draft: !anyPublished,
            overrideAccess: true,
          });
        }
      }

      report.created.push(key);
    } catch (error) {
      console.error(`[migrate] ${key} failed:`, error);
      report.failed.push(key);
    }
  }

  console.log("\nmigració del blog:");
  console.log(
    `  creats:  ${report.created.length} ${report.created.join(", ")}`,
  );
  console.log(
    `  omesos:  ${report.skipped.length} ${report.skipped.join(", ")}`,
  );
  console.log(`  fallits: ${report.failed.length} ${report.failed.join(", ")}`);

  if (report.failed.length > 0) process.exitCode = 1;
  // Payload keeps a pool open; exit explicitly once the report is printed.
  process.exit(process.exitCode ?? 0);
}

void main();
