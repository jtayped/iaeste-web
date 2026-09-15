#!/usr/bin/env node
// Reports what is occupying the repository's 10GB Actions cache, grouped by
// what wrote each entry, and fails above a threshold so the scheduled run
// emails someone. GitHub evicts by LRU without telling anyone, so a category
// that quietly grows to fill the cap shows up only as a falling cache-hit
// rate somewhere else entirely.

import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";

const LIMIT = 10 * 1024 ** 3;
const WARN_AT = 0.8;

// Longest-prefix wins, so the buildkit index doesn't fall into the blob group.
const CATEGORIES = [
  [/^turbogha_/, "turbo task cache"],
  [/^buildkit-blob/, "docker layer blobs"],
  [/^index-/, "docker layer index"],
  [/^node-cache/, "npm (setup-node)"],
];

// --slurp, because --paginate on its own concatenates one JSON object per
// page into a stream that JSON.parse cannot read.
function allCaches(repo) {
  const pages = JSON.parse(
    execFileSync(
      "gh",
      [
        "api",
        "--paginate",
        "--slurp",
        `repos/${repo}/actions/caches?per_page=100`,
      ],
      { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
    ),
  );
  return pages.flatMap((page) => page.actions_caches ?? []);
}

function categorise(key) {
  return CATEGORIES.find(([re]) => re.test(key))?.[1] ?? "other";
}

function gib(bytes) {
  return (bytes / 1024 ** 3).toFixed(2);
}

const repo = process.env.REPO;
const caches = allCaches(repo);

const groups = new Map();
for (const { key, size_in_bytes: size } of caches) {
  const name = categorise(key);
  const g = groups.get(name) ?? { count: 0, bytes: 0 };
  groups.set(name, { count: g.count + 1, bytes: g.bytes + size });
}

const total = caches.reduce((n, c) => n + c.size_in_bytes, 0);
const used = total / LIMIT;
const ranked = [...groups].sort((a, b) => b[1].bytes - a[1].bytes);

const lines = [
  `## Actions cache: ${gib(total)} / 10.00 GiB (${Math.round(used * 100)}%)`,
  "",
  "| what wrote it | entries | size |",
  "| --- | ---: | ---: |",
  ...ranked.map(
    ([name, g]) => `| ${name} | ${g.count} | ${gib(g.bytes)} GiB |`,
  ),
];

if (used >= WARN_AT) {
  const [worst] = ranked;
  lines.push(
    "",
    `**Over ${WARN_AT * 100}% of the cap.** GitHub is evicting by LRU, which`,
    "degrades every other cache in the repo without reporting it.",
    "",
    `Largest category: **${worst[0]}** at ${gib(worst[1].bytes)} GiB.`,
  );
}

const body = lines.join("\n");
console.log(body);
if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${body}\n`);
}

if (used >= WARN_AT) {
  process.exitCode = 1;
}
