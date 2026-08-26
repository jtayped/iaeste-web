import { OpenAPIHono } from "@hono/zod-openapi";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { requestId } from "hono/request-id";
import { secureHeaders } from "hono/secure-headers";

import { registrationSchema } from "@repo/constants/validators/registration";
import { IllegalTransitionError, NotFoundError } from "@repo/db/repositories";

import { getAllowedOrigins } from "./config";
import { apiErrorSchema } from "./contracts";
import { getOpenAPIDocument } from "./openapi";
import {
  createDrizzleRegistrationRepository,
  type RegistrationRepository,
} from "./repositories/registrations";
import {
  adminAcceptRegistrationRoute,
  adminListRegistrationsRoute,
  adminRejectRegistrationRoute,
  createRegistrationRoute,
  healthRoute,
  resendVerificationRoute,
  verifyRegistrationGetRoute,
  verifyRegistrationPostRoute,
} from "./routes";
import {
  createDrizzleRegistrationService,
  type RegistrationService,
} from "./services/registration-service";
import { API_VERSION } from "./version";

type AppDependencies = {
  logger?: Pick<Console, "error">;
  registrationRepository?: RegistrationRepository;
  registrationService?: RegistrationService;
};

function errorBody(
  requestIdValue: string,
  code:
    | "VALIDATION_ERROR"
    | "UNSUPPORTED_MEDIA_TYPE"
    | "PAYLOAD_TOO_LARGE"
    | "NOT_FOUND"
    | "CONFLICT"
    | "INVALID_TOKEN"
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
    createDrizzleRegistrationRepository();
  const registrationService =
    dependencies.registrationService ?? createDrizzleRegistrationService();
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
      allowMethods: ["GET", "POST", "OPTIONS"],
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

  // Public, deliberately non-revealing — see resendVerificationRoute's doc
  // comment in routes.ts. `registrationService.resendVerification` never
  // throws for "not found" / "wrong status" / "cooling down"; it just does
  // nothing, so this handler always returns the same 200 body.
  app.openapi(resendVerificationRoute, async (c) => {
    const { id } = c.req.valid("param");
    await registrationService.resendVerification(id);
    return c.json(
      {
        status: "ok" as const,
        message:
          "Si la sol·licitud existeix i està pendent de verificació, " +
          "t'hem enviat un nou correu de verificació.",
      },
      200,
    );
  });

  // Consumes the token and moves pending_email -> pending_review. Any
  // failure (bad/expired/already-used token, or the rarer race where a
  // second request already verified it) collapses to the same generic
  // INVALID_TOKEN response — never leaks which case it was.
  async function handleVerify(rawToken: string, requestIdValue: string) {
    try {
      await registrationService.verify(rawToken);
      return { ok: true as const };
    } catch (error) {
      if (error instanceof IllegalTransitionError) {
        return {
          ok: false as const,
          body: errorBody(
            requestIdValue,
            "INVALID_TOKEN",
            "This verification link is invalid, expired, or already used.",
          ),
        };
      }
      throw error;
    }
  }

  app.openapi(verifyRegistrationGetRoute, async (c) => {
    const { token } = c.req.valid("query");
    const result = await handleVerify(token, c.get("requestId"));
    if (!result.ok) return c.json(result.body, 400);
    return c.json({ status: "verified" as const }, 200);
  });

  app.openapi(verifyRegistrationPostRoute, async (c) => {
    const { token } = c.req.valid("json");
    const result = await handleVerify(token, c.get("requestId"));
    if (!result.ok) return c.json(result.body, 400);
    return c.json({ status: "verified" as const }, 200);
  });

  // -------------------------------------------------------------------
  // UNAUTHENTICATED ADMIN ROUTES — see the block comment above
  // `adminListRegistrationsRoute` in routes.ts before changing anything
  // here. There is no session, no admin-role check, nothing: IA-30/IA-31
  // add that in Milestone 2. Do not expose these publicly or link them
  // from a deployed frontend until then.
  // -------------------------------------------------------------------

  app.openapi(adminListRegistrationsRoute, async (c) => {
    const { campaignId, status } = c.req.valid("query");
    const registrations = await registrationService.list(campaignId, status);
    return c.json(registrations, 200);
  });

  app.openapi(adminAcceptRegistrationRoute, async (c) => {
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    try {
      const result = await registrationService.accept(id, body);
      return c.json(
        {
          status: "accepted" as const,
          notificationSent: result.notificationSent,
        },
        200,
      );
    } catch (error) {
      if (error instanceof NotFoundError) {
        return c.json(
          errorBody(
            c.get("requestId"),
            "NOT_FOUND",
            "No registration with that id.",
          ),
          404,
        );
      }
      if (error instanceof IllegalTransitionError) {
        return c.json(
          errorBody(
            c.get("requestId"),
            "CONFLICT",
            "The registration is not awaiting review.",
          ),
          409,
        );
      }
      throw error;
    }
  });

  app.openapi(adminRejectRegistrationRoute, async (c) => {
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    try {
      const result = await registrationService.reject(id, body);
      return c.json(
        {
          status: "rejected" as const,
          notificationSent: result.notificationSent,
        },
        200,
      );
    } catch (error) {
      if (error instanceof NotFoundError) {
        return c.json(
          errorBody(
            c.get("requestId"),
            "NOT_FOUND",
            "No registration with that id.",
          ),
          404,
        );
      }
      if (error instanceof IllegalTransitionError) {
        return c.json(
          errorBody(
            c.get("requestId"),
            "CONFLICT",
            "The registration is not awaiting review.",
          ),
          409,
        );
      }
      throw error;
    }
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
