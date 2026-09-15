#!/usr/bin/env node
// Works out which of the five deployable apps a change actually affects, using
// turbo's own dependency graph rather than a flat path glob. A change to
// packages/ui correctly marks every app that imports it; a change confined to
// apps/web/src marks only web.
//
// Both workflows gate on this. deploy.yml decides which images to build and
// push and which Coolify resources to redeploy; ci.yml decides which images a
// pull request bothers building at all. A paths-filter could only answer "did
// anything under apps/ or packages/ change", which is what both used to do.
//
// Runs before `npm ci` on purpose: turbo reads the workspace graph straight
// out of the package.json files and the lockfile, so `npx turbo --dry=json`
// needs no node_modules and the whole job stays a few seconds long.
//
// Fails open. A deploy that goes wide when it didn't need to costs CI minutes;
// one that silently skips an app that did change ships a half-updated
// production. Anything unexpected here marks all five affected and says why.

import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";

// turbo package name -> the app id deploy.yml's jobs are keyed by.
const APPS = {
  "@repo/api": "api",
  admin: "admin",
  cms: "cms",
  inscripcions: "inscripcions",
  web: "web",
};

const ALL = Object.values(APPS);
const TURBO_VERSION = "2.6.1";

// Root-level paths that cannot change how any app builds. Anything not
// matched here is treated as build-relevant, so a new root file fails open.
const INERT_ROOT = /^(docs|plans)\/|^[^/]+\.md$/;

function git(...args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

// The base to diff against. An explicit BASE_SHA wins: a pull request run has
// no `github.event.before` and wants the base branch's tip instead. Otherwise
// `github.event.before` covers every commit in a push, where HEAD^1 would only
// cover the last one when several land at once. It is all-zeros on a branch's
// first push and unreachable after a force-push, hence the fallbacks.
function resolveBase() {
  const explicit = process.env.BASE_SHA ?? "";
  if (explicit && !/^0+$/.test(explicit)) {
    try {
      git("cat-file", "-e", `${explicit}^{commit}`);
      return { ref: explicit, how: "BASE_SHA" };
    } catch {
      // Not in this clone — a shallow checkout, most likely. Fall through
      // rather than fail: the remaining bases are still worth trying.
    }
  }

  const before = process.env.BEFORE_SHA ?? "";
  if (before && !/^0+$/.test(before)) {
    try {
      git("cat-file", "-e", `${before}^{commit}`);
      return { ref: before, how: "github.event.before" };
    } catch {
      // Force-pushed or otherwise gone from the remote; fall through.
    }
  }
  try {
    return { ref: git("rev-parse", "HEAD^1"), how: "HEAD^1 (first parent)" };
  } catch {
    return null;
  }
}

// Changed files that belong to no workspace, which is what turbo folds into
// the "//" root package.
function changedRootFiles(base) {
  return git("diff", "--name-only", base, "HEAD")
    .split("\n")
    .filter((f) => f && !/^(apps|packages|tooling)\//.test(f));
}

function affectedPackages(base) {
  const out = execFileSync(
    "npx",
    [
      "--yes",
      `turbo@${TURBO_VERSION}`,
      "run",
      "build",
      `--filter=...[${base}]`,
      "--dry=json",
    ],
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  );
  return JSON.parse(out).packages ?? [];
}

function report({ affected, reason, base, packages }) {
  const lines = [
    "## Affected apps",
    "",
    `**Base:** ${base ?? "unresolved"}`,
    `**Reason:** ${reason}`,
    "",
    "| App | Affected |",
    "| --- | --- |",
    ...ALL.map((a) => `| ${a} | ${affected.has(a) ? "yes" : "no"} |`),
  ];
  if (packages) {
    lines.push(
      "",
      `<details><summary>turbo reported ${packages.length} changed package(s)</summary>`,
      "",
      "```",
      packages.join("\n"),
      "```",
      "",
      "</details>",
    );
  }

  const body = lines.join("\n");
  console.log(body);

  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${body}\n`);
  }
  if (process.env.GITHUB_OUTPUT) {
    // One boolean per app, which deploy.yml's per-app jobs gate on, plus the
    // same answer as a JSON array. ci.yml needs the array because a job-level
    // `if` cannot read the matrix context, so an unaffected image has to be
    // filtered out of the matrix rather than skipped inside the job.
    const outputs = ALL.map((a) => `${a}=${affected.has(a)}`).join("\n");
    const json = JSON.stringify(ALL.filter((a) => affected.has(a)));
    appendFileSync(
      process.env.GITHUB_OUTPUT,
      `${outputs}\napps_json=${json}\n`,
    );
  }
}

function main() {
  // deploy.yml itself, the deploy script, and anything else outside a
  // workspace are invisible to turbo's graph, so paths-filter still owns them.
  if (process.env.FORCE_ALL === "true") {
    report({
      affected: new Set(ALL),
      reason:
        "a workflow or deploy-script path changed, which turbo's graph cannot see",
      base: null,
    });
    return;
  }

  const base = resolveBase();
  if (!base) {
    report({
      affected: new Set(ALL),
      reason: "no usable base commit to diff against",
      base: null,
    });
    return;
  }

  let packages;
  try {
    packages = affectedPackages(base.ref);
  } catch (error) {
    report({
      affected: new Set(ALL),
      reason: `turbo could not resolve the affected set (${error.message.split("\n")[0]})`,
      base: `${base.ref} via ${base.how}`,
    });
    return;
  }

  // "//" is the workspace root, and turbo attributes every file outside a
  // workspace to it — turbo.json and the lockfile, but equally a docs edit.
  // The first genuinely can change how all five apps build; the second cannot,
  // and this repo edits docs alongside app code often enough that treating the
  // two alike would force a full deploy most of the time. So look at what
  // actually changed at the root, and only fail open when it isn't inert.
  if (packages.includes("//")) {
    const rootFiles = changedRootFiles(base.ref);
    const live = rootFiles.filter((f) => !INERT_ROOT.test(f));
    if (live.length > 0) {
      report({
        affected: new Set(ALL),
        reason: `the workspace root changed (${live.slice(0, 4).join(", ")}${live.length > 4 ? `, +${live.length - 4} more` : ""})`,
        base: `${base.ref} via ${base.how}`,
        packages,
      });
      return;
    }
  }

  report({
    affected: new Set(packages.map((p) => APPS[p]).filter(Boolean)),
    reason: "turbo dependency graph",
    base: `${base.ref} via ${base.how}`,
    packages,
  });
}

main();
