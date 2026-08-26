import type { OpenAPIHono } from "@hono/zod-openapi";

import { API_VERSION } from "./version";

export const openAPIConfig = {
  openapi: "3.1.0" as const,
  info: {
    title: "IAESTE Lleida API",
    version: API_VERSION,
    description: "Public API for IAESTE LC Lleida applications.",
  },
  servers: [
    {
      url: "https://api.iaestelleida.cat",
      description: "Production",
    },
    {
      url: "http://localhost:3004",
      description: "Local development",
    },
  ],
};

export function getOpenAPIDocument(app: OpenAPIHono) {
  return app.getOpenAPI31Document(openAPIConfig);
}
