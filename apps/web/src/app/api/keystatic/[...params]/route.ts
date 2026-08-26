import { makeRouteHandler } from "@keystatic/next/route-handler";

import { repoRoot } from "@/lib/repo-root";

import keystaticConfig from "../../../../../../../keystatic.config";

export const { GET, POST } = makeRouteHandler({
  config: keystaticConfig,
  localBaseDirectory: repoRoot,
});
