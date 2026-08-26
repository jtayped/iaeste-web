import path from "node:path";

export const repoRoot = process.cwd().endsWith(path.join("apps", "web"))
  ? path.resolve(process.cwd(), "../..")
  : process.cwd();
