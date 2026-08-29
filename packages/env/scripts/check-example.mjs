import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Checks that the root `.env.example` documents exactly the environment
 * variables the apps actually read: every key a `@repo/env` schema expects,
 * and every key `apps/api` reads via `process.env`/`requireEnvironmentVariable`.
 *
 * A stale `.env.example` (missing a key, or documenting one nothing reads
 * any more) is exactly the kind of drift IA-03's typed env config exists to
 * catch — this script just checks the doc file against that source of truth.
 *
 * Run with `tsx` (not plain `node`) so the `@repo/env` schema modules, which
 * use extensionless relative imports, resolve correctly.
 */

const rootDir = fileURLToPath(new URL("../../..", import.meta.url));
const envExamplePath = path.join(rootDir, ".env.example");
const envExampleContent = readFileSync(envExamplePath, "utf8");

// --- Parse `.env.example` into { section -> Set<key> } ---------------------

function parseEnvExampleSections(content) {
  const sections = new Map();
  let current = "unknown";

  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();

    const sectionMatch = line.match(/^#\s*(apps\/[a-z-]+)/);
    if (sectionMatch) {
      current = sectionMatch[1];
      if (!sections.has(current)) sections.set(current, new Set());
      continue;
    }

    if (!line || line.startsWith("#")) continue;

    const keyMatch = line.match(/^([A-Z][A-Z0-9_]*)=/);
    if (keyMatch) {
      if (!sections.has(current)) sections.set(current, new Set());
      sections.get(current).add(keyMatch[1]);
    }
  }

  return sections;
}

// --- Fake values to feed the schemas so every module parses successfully ---
// Reuses `.env.example`'s own example values (already valid urls/emails/
// enum members), falling back to a generic placeholder for the secrets that
// are intentionally left blank there.

function buildFakeEnv(content) {
  const values = {};
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, key, value] = match;
    values[key] = value || "changeme";
  }
  return values;
}

async function loadSchemaKeys(modulePath, fakeEnv) {
  const saved = {};
  for (const [key, value] of Object.entries(fakeEnv)) {
    saved[key] = process.env[key];
    process.env[key] = value;
  }

  try {
    const mod = await import(modulePath);
    return new Set(Object.keys(mod.env));
  } finally {
    for (const [key, original] of Object.entries(saved)) {
      if (original === undefined) delete process.env[key];
      else process.env[key] = original;
    }
  }
}

// --- apps/api reads process.env directly; find its keys by grepping src ----

function listFilesRecursively(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return listFilesRecursively(entryPath);
    if (entry.isFile() && entry.name.endsWith(".ts")) return [entryPath];
    return [];
  });
}

function findApiEnvKeys(apiSrcDir) {
  const keys = new Set();
  const directAccess = /process\.env\.([A-Z][A-Z0-9_]*)/g;
  const requireHelper =
    /requireEnvironmentVariable\(\s*["']([A-Z][A-Z0-9_]*)["']/g;

  for (const file of listFilesRecursively(apiSrcDir)) {
    const content = readFileSync(file, "utf8");
    for (const match of content.matchAll(directAccess)) keys.add(match[1]);
    for (const match of content.matchAll(requireHelper)) keys.add(match[1]);
  }

  return keys;
}

// --- Compare and report ------------------------------------------------------

function diffSections(label, documented, expected, failures) {
  const missing = [...expected].filter((key) => !documented.has(key)).sort();
  const extra = [...documented].filter((key) => !expected.has(key)).sort();

  if (missing.length === 0 && extra.length === 0) {
    console.log(`  ok: ${label}`);
    return;
  }

  if (missing.length > 0) {
    failures.push(
      `${label}: .env.example is missing key(s) that are read: ${missing.join(", ")}`,
    );
  }
  if (extra.length > 0) {
    failures.push(
      `${label}: .env.example documents key(s) nothing reads any more: ${extra.join(", ")}`,
    );
  }
}

async function main() {
  const documentedSections = parseEnvExampleSections(envExampleContent);
  const fakeEnv = buildFakeEnv(envExampleContent);
  const failures = [];

  console.log(
    "Checking .env.example against @repo/env schemas and apps/api...",
  );

  // apps/inscripcions
  const inscripcionsKeys = await loadSchemaKeys(
    path.join(rootDir, "packages/env/src/inscripcions.ts"),
    fakeEnv,
  );
  diffSections(
    "apps/inscripcions",
    documentedSections.get("apps/inscripcions") ?? new Set(),
    inscripcionsKeys,
    failures,
  );

  // apps/admin
  const adminServerKeys = await loadSchemaKeys(
    path.join(rootDir, "packages/env/src/admin.server.ts"),
    fakeEnv,
  );
  diffSections(
    "apps/admin",
    documentedSections.get("apps/admin") ?? new Set(),
    adminServerKeys,
    failures,
  );

  // apps/cms
  const cmsServerKeys = await loadSchemaKeys(
    path.join(rootDir, "packages/env/src/cms.server.ts"),
    fakeEnv,
  );
  diffSections(
    "apps/cms",
    documentedSections.get("apps/cms") ?? new Set(),
    cmsServerKeys,
    failures,
  );

  // apps/web (client + server schemas share one .env.example section)
  const webClientKeys = await loadSchemaKeys(
    path.join(rootDir, "packages/env/src/web.client.ts"),
    fakeEnv,
  );
  const webServerKeys = await loadSchemaKeys(
    path.join(rootDir, "packages/env/src/web.server.ts"),
    fakeEnv,
  );
  const webKeys = new Set([...webClientKeys, ...webServerKeys]);
  diffSections(
    "apps/web",
    documentedSections.get("apps/web") ?? new Set(),
    webKeys,
    failures,
  );

  // apps/api reads process.env directly (exempt from @repo/env, see
  // tooling/eslint/base.js `boundaryRules`), so compare against a grep of
  // its source instead of a schema.
  const apiKeys = findApiEnvKeys(path.join(rootDir, "apps/api/src"));
  diffSections(
    "apps/api",
    documentedSections.get("apps/api") ?? new Set(),
    apiKeys,
    failures,
  );

  if (failures.length > 0) {
    console.error("\n.env.example is out of date:\n");
    for (const failure of failures) console.error(`  - ${failure}`);
    console.error("\nUpdate .env.example (or the code/schema) to match.");
    process.exitCode = 1;
    return;
  }

  console.log("\n.env.example matches the schemas and code.");
}

await main();
