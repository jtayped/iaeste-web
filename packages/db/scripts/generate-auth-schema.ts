// Regenerates `src/schema/auth.ts` from Better Auth's own schema generator.
// Run with `npm run auth:generate-schema`, then diff and review the result
// before committing — see the header comment in `src/schema/auth.ts`.
//
// `@better-auth/cli`'s published version trails the `better-auth` version
// used elsewhere in this package (there is no newer release at the time of
// writing), but the generator only inspects the local `better-auth` install
// through the config module it is pointed at, so the version gap does not
// change the tables it produces. Verified by running it and inspecting the
// output; re-verify after any `better-auth` upgrade.
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(here, "..");
const configPath = path.join(here, "auth-schema-source.ts");
const outputPath = path.join(packageRoot, "src", "schema", "auth.generated.ts");

const result = spawnSync(
  "npx",
  [
    "--yes",
    "@better-auth/cli@latest",
    "generate",
    "--config",
    configPath,
    "--output",
    outputPath,
    "-y",
  ],
  { cwd: packageRoot, stdio: "inherit" },
);

if (result.status !== 0) {
  console.error("Better Auth schema generation failed.");
  process.exit(result.status ?? 1);
}

console.log(
  `\nWrote ${path.relative(packageRoot, outputPath)}.\n` +
    "Diff it against src/schema/auth.ts, fold in any real changes, drop any " +
    "unwanted plugin tables, then delete the .generated.ts file — see the " +
    "header comment in src/schema/auth.ts.",
);
