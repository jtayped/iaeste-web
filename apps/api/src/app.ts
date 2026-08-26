import { OpenAPIHono } from "@hono/zod-openapi";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { requestId } from "hono/request-id";
import { secureHeaders } from "hono/secure-headers";

import { registrationSchema } from "@repo/constants/validators/registration";

import { getAllowedOrigins } from "./config";
import { apiErrorSchema } from "./contracts";
import { getOpenAPIDocument } from "./openapi";
import {
  createGoogleSheetsRegistrationRepository,
  type RegistrationRepository,
} from "./repositories/registrations";
import { createRegistrationRoute, healthRoute } from "./routes";
import { API_VERSION } from "./version";

type AppDependencies = {
  logger?: Pick<Console, "error">;
  registrationRepository?: RegistrationRepository;
};

function errorBody(
  requestIdValue: string,
  code:
    | "VALIDATION_ERROR"
    | "UNSUPPORTED_MEDIA_TYPE"
    | "PAYLOAD_TOO_LARGE"
    | "NOT_FOUND"
    | "INTERNAL_ERROR",
  message: string,
  details?: Array<{ path: Array<string | number>; message: string }>,
) {
  return apiErrorSchema.parse({
    error: { code, message, details },
    requestId: requestIdValue,
  });
}

export function createApp(dependencies: AppDependencies = {}) {
  const registrationRepository =
    dependencies.registrationRepository ??
    createGoogleSheetsRegistrationRepository();
  const logger = dependencies.logger ?? console;
  const allowedOrigins = getAllowedOrigins();
  const app = new OpenAPIHono({
    defaultHook(result, c) {
      if (result.success) return;

      return c.json(
        errorBody(
          c.get("requestId"),
          "VALIDATION_ERROR",
          "The request is invalid.",
          result.error.issues.map((issue) => ({
            path: issue.path.map((part) =>
              typeof part === "symbol" ? part.description || "unknown" : part,
            ),
            message: issue.message,
          })),
        ),
        422,
      );
    },
  });

  app.use("*", requestId());
  app.use("*", secureHeaders());
  app.use(
    "/v1/*",
    cors({
      origin: (origin) =>
        allowedOrigins.includes(origin.replace(/\/$/, "")) ? origin : "",
      allowMethods: ["POST", "OPTIONS"],
      allowHeaders: ["Content-Type", "X-Request-Id"],
      exposeHeaders: ["X-Request-Id"],
      maxAge: 86_400,
    }),
  );
  app.use("/v1/*", async (c, next) => {
    if (c.req.method !== "POST") return next();

    const contentType = c.req.header("content-type") ?? "";
    if (!/^application\/json(?:\s*;.*)?$/i.test(contentType)) {
      return c.json(
        errorBody(
          c.get("requestId"),
          "UNSUPPORTED_MEDIA_TYPE",
          "Content-Type must be application/json.",
        ),
        415,
      );
    }

    return next();
  });
  app.use(
    "/v1/*",
    bodyLimit({
      maxSize: 32 * 1024,
      onError: (c) =>
        c.json(
          errorBody(
            c.get("requestId"),
            "PAYLOAD_TOO_LARGE",
            "The request body is too large.",
          ),
          413,
        ),
    }),
  );

  app.openapi(healthRoute, (c) =>
    c.json({ status: "ok" as const, version: API_VERSION }, 200),
  );

  app.openapi(createRegistrationRoute, async (c) => {
    const parsed = registrationSchema.safeParse(c.req.valid("json"));
    if (!parsed.success) {
      return c.json(
        errorBody(
          c.get("requestId"),
          "VALIDATION_ERROR",
          "The request is invalid.",
          parsed.error.issues.map((issue) => ({
            path: issue.path.map((part) =>
              typeof part === "symbol" ? part.description || "unknown" : part,
            ),
            message: issue.message,
          })),
        ),
        422,
      );
    }

    await registrationRepository.create(parsed.data);
    return c.json({ status: "created" as const }, 201);
  });

  app.get("/openapi.json", (c) => c.json(getOpenAPIDocument(app)));
  app.get("/docs", (c) =>
    c.html(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>IAESTE Lleida API</title>
  </head>
  <body>
    <script id="api-reference" data-url="/openapi.json"></script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  </body>
</html>`),
  );

  app.notFound((c) =>
    c.json(errorBody(c.get("requestId"), "NOT_FOUND", "Route not found."), 404),
  );

  app.onError((error, c) => {
    logger.error(`[${c.get("requestId")}]`, error);
    return c.json(
      errorBody(
        c.get("requestId"),
        "INTERNAL_ERROR",
        "The request could not be completed.",
      ),
      500,
    );
  });

  return app;
}

const app = createApp();

export default app;
