import { defineConfig } from "tsup";

export default defineConfig({
  clean: true,
  entry: ["src/server.ts", "src/migrate.ts"],
  external: ["pg"],
  format: ["esm"],
  noExternal: [/^@repo\//],
  outDir: "dist",
  platform: "node",
  target: "node22",
});
