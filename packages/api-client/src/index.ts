import createClient from "openapi-fetch";

import type { paths } from "./generated/v1";

export type { components, operations, paths } from "./generated/v1";

export function createApiClient(baseUrl: string) {
  return createClient<paths>({ baseUrl: baseUrl.replace(/\/$/, "") });
}
