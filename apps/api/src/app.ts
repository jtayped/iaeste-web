import { OpenAPIHono } from "@hono/zod-openapi";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { requestId } from "hono/request-id";
import { secureHeaders } from "hono/secure-headers";

import { can, revokeAllUserSessions, type Auth } from "@repo/auth";
import type { Database } from "@repo/db/client";
import { parsePhone } from "@repo/constants/validators/phone";
import { registrationSchema } from "@repo/constants/validators/registration";
import { getDb } from "@repo/db/client";
import {
  createCampaignRepository,
  createMemberRepository,
  createMembershipEventRepository,
  createMembershipRepository,
  createOverviewRepository,
  createPushSubscriptionRepository,
  IllegalTransitionError,
  NotFoundError,
} from "@repo/db/repositories";

import { getAllowedOrigins, getWebPushConfig } from "./config";
import { errorBody } from "./lib/api-error";
import { membersCsv, membersCsvFilename } from "./lib/member-export";
import {
  createNoopPushNotifier,
  createPushNotifier,
  type PushNotifier,
} from "./lib/web-push";
import { createRequireCapability } from "./lib/admin-auth";
import { toCampaignView } from "./lib/campaign-view";
import { toMemberDetail } from "./lib/member-detail";
import { allowRequest } from "./lib/rate-limit";
import {
  createInvitationService,
  type InvitationService,
} from "./services/invitation-service";
import { getAuth } from "./lib/auth";
import { getOpenAPIDocument } from "./openapi";
import {
  createDrizzleRegistrationRepository,
  RegistrationAlreadyExistsError,
  RegistrationsClosedError,
  type RegistrationRepository,
} from "./repositories/registrations";
import {
  adminAcceptRegistrationRoute,
  adminArchiveCampaignRoute,
  adminCreateCampaignRoute,
  adminCancelInvitationRoute,
  adminCreateInvitationRoute,
  adminGetMemberRoute,
  adminGetRegistrationRoute,
  adminListInvitationsRoute,
  adminListCampaignsRoute,
  adminListMembersRoute,
  adminMemberKickRoute,
  adminMemberLeaveRoute,
  adminMemberRestoreRoute,
  adminMemberSetRoleRoute,
  adminListRegistrationsRoute,
  adminOverviewRoute,
  adminPushPublicKeyRoute,
  adminPushSubscribeRoute,
  adminPushUnsubscribeRoute,
  adminResendInvitationRoute,
  adminRestoreRegistrationRoute,
  adminSetCampaignCurrentRoute,
  adminSetCampaignRegistrationRoute,
  adminUpdateCampaignRoute,
  adminRejectRegistrationRoute,
  createRegistrationRoute,
  healthRoute,
  registrationStatusRoute,
  resendVerificationRoute,
  invitationAcceptRoute,
  invitationLookupRoute,
  verifyRegistrationGetRoute,
  verifyRegistrationPostRoute,
} from "./routes";
import {
  createDrizzleRegistrationService,
  type RegistrationService,
} from "./services/registration-service";
import { API_VERSION } from "./version";

type AppDependencies = {
  isRegistrationOpen?: () => Promise<boolean>;
  logger?: Pick<Console, "error">;
  registrationRepository?: RegistrationRepository;
  registrationService?: RegistrationService;
  /** Overridable so tests can point Better Auth at the test database and a recording emailer — see `getAuth()`'s doc comment for why this isn't resolved here. */
  auth?: Auth;
  /** IA-31: overridable so unit tests skip the real `member_profile` lookup. */
  hasMemberProfile?: (userId: string) => Promise<boolean>;
  invitationService?: InvitationService;
  /** IA: overridable so tests inject a recording push notifier. */
  pushNotifier?: PushNotifier;
  /**
   * The database the admin domain handlers (overview, campaigns, members,
   * invitations) use. Defaults to the app-wide `getDb()`; overridable so
   * integration tests can point these handlers at `iaeste_test`.
   */
  db?: Database;
};

export function createApp(dependencies: AppDependencies = {}) {
  const isRegistrationOpen =
    dependencies.isRegistrationOpen ??
    (async () => {
      const campaign =
        await createCampaignRepository(getDb()).getOpenForRegistration();
      return campaign !== undefined;
    });
  const registrationRepository =
    dependencies.registrationRepository ??
    createDrizzleRegistrationRepository();
  const registrationService =
    dependencies.registrationService ?? createDrizzleRegistrationService();
  const logger = dependencies.logger ?? console;
  const adminDb = () => dependencies.db ?? getDb();
  const invitationService =
    dependencies.invitationService ??
    createInvitationService({ db: dependencies.db });
  const authInstance = () => dependencies.auth ?? getAuth();
  const pushSubscriptions = () => createPushSubscriptionRepository(adminDb());
  const pushNotifier =
    dependencies.pushNotifier ??
    (() => {
      const webPushConfig = getWebPushConfig();
      if (!webPushConfig) return createNoopPushNotifier();
      return createPushNotifier({
        config: webPushConfig,
        listTargets: () => pushSubscriptions().listForAdmins(),
        forgetTarget: (endpoint) =>
          pushSubscriptions().deleteByEndpoint(endpoint),
        logger,
      });
    })();
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

  app.openapi(registrationStatusRoute, async (c) =>
    c.json({ open: await isRegistrationOpen() }, 200),
  );
  // IA-30: Better Auth's own routes (sign-in/magic-link, magic-link/verify,
  // get-session, the admin-plugin endpoints, etc.), mounted as a raw
  // fetch-style handler rather than `@hono/zod-openapi` route definitions
  // — Better Auth owns its own request/response contract, so these are
  // deliberately NOT part of this app's OpenAPI document (confirmed by
  // `npm run generate:api` producing no diff after adding this mount).
  // `OpenAPIHono` extends plain Hono, so `.on(...)` works exactly as it
  // would on a plain Hono app.
  //
  // `getAuth()` is called from *inside* the handler, not at the top of
  // `createApp()`: constructing it touches `getDb()`/`BETTER_AUTH_SECRET`
  // (see `lib/auth.ts`'s doc comment), and `createApp()` runs at
  // module-import time (`apps/api/scripts/generate-openapi.ts`), so
  // resolving those eagerly here would make merely importing `app.ts`
  // crash wherever they're unset.
  //
  // Better Auth gets its canonical scheme and host from ADMIN_PUBLIC_ORIGIN,
  // so it does not need to trust client-spoofable X-Forwarded-* headers when
  // requests arrive through the admin rewrite and Coolify's Traefik proxy.
  app.on(["GET", "POST", "PUT", "PATCH", "DELETE"], "/api/auth/*", (c) => {
    const auth = dependencies.auth ?? getAuth();
    return auth.handler(c.req.raw);
  });

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

    try {
      const created = await registrationRepository.create(parsed.data);
      return c.json({ status: "created" as const, id: created.id }, 201);
    } catch (error) {
      if (error instanceof RegistrationsClosedError) {
        return c.json(
          errorBody(
            c.get("requestId"),
            "CONFLICT",
            "Registration is not currently open.",
          ),
          409,
        );
      }
      if (error instanceof RegistrationAlreadyExistsError) {
        return c.json(
          errorBody(
            c.get("requestId"),
            "ALREADY_REGISTERED",
            "A registration already exists for this email.",
          ),
          409,
        );
      }
      throw error;
    }
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
      void pushNotifier.notifyAdmins({
        title: "Nova sol·licitud",
        body: "Algú ha verificat el correu i espera revisió.",
        url: "/registrations",
        tag: "registration-review",
      });
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
  // ADMIN ROUTES — authorized by `requireCapability` (IA-31). Each route
  // resolves the session from the forwarded cookie, 401s when signed out,
  // 403s when the role lacks the capability or the user has no
  // `member_profile` row. The reviewer/actor is always the session user,
  // never a value from the request body.
  // -------------------------------------------------------------------
  const requireCapability = createRequireCapability({
    getAuth: () => dependencies.auth ?? getAuth(),
    hasMemberProfile: dependencies.hasMemberProfile,
  });

  app.use("/v1/admin/overview", requireCapability("admin.access"));
  app.use("/v1/admin/push/public-key", requireCapability("admin.access"));
  app.use("/v1/admin/push/subscribe", requireCapability("admin.access"));
  app.use("/v1/admin/push/unsubscribe", requireCapability("admin.access"));
  app.use("/v1/admin/campaigns", requireCapability("campaigns.write"));
  app.use("/v1/admin/campaigns/:id", requireCapability("campaigns.write"));
  app.use(
    "/v1/admin/campaigns/:id/registration",
    requireCapability("campaigns.rollover"),
  );
  app.use(
    "/v1/admin/campaigns/:id/current",
    requireCapability("campaigns.rollover"),
  );
  app.use(
    "/v1/admin/campaigns/:id/archive",
    requireCapability("campaigns.rollover"),
  );
  app.use("/v1/admin/members", requireCapability("members.read"));
  // Before the `:userId` matcher below, or "export" is read as a user id.
  app.use("/v1/admin/members/export", requireCapability("members.read"));
  app.use("/v1/admin/members/:userId", requireCapability("members.read"));
  app.use(
    "/v1/admin/members/:userId/leave",
    requireCapability("members.status.write"),
  );
  app.use(
    "/v1/admin/members/:userId/kick",
    requireCapability("members.status.write"),
  );
  app.use(
    "/v1/admin/members/:userId/restore",
    requireCapability("members.status.write"),
  );
  app.use(
    "/v1/admin/members/:userId/role",
    requireCapability("members.role.write"),
  );
  app.use("/v1/admin/invitations", requireCapability("invitations.write"));
  app.use(
    "/v1/admin/invitations/:id/resend",
    requireCapability("invitations.write"),
  );
  app.use(
    "/v1/admin/invitations/:id/cancel",
    requireCapability("invitations.write"),
  );
  app.use("/v1/admin/registrations", requireCapability("registrations.review"));
  app.use(
    "/v1/admin/registrations/:id",
    requireCapability("registrations.review"),
  );
  app.use(
    "/v1/admin/registrations/:id/accept",
    requireCapability("registrations.review"),
  );
  app.use(
    "/v1/admin/registrations/:id/restore",
    requireCapability("registrations.review"),
  );
  app.use(
    "/v1/admin/registrations/:id/reject",
    requireCapability("registrations.review"),
  );

  app.openapi(adminPushPublicKeyRoute, (c) =>
    c.json({ publicKey: pushNotifier.publicKey }, 200),
  );

  app.openapi(adminPushSubscribeRoute, async (c) => {
    const body = c.req.valid("json");
    await pushSubscriptions().save({
      userId: c.get("authUser").id,
      endpoint: body.endpoint,
      keys: body.keys,
      userAgent: body.userAgent ?? null,
    });
    return c.json({ status: "subscribed" as const }, 200);
  });

  app.openapi(adminPushUnsubscribeRoute, async (c) => {
    const body = c.req.valid("json");
    await pushSubscriptions().deleteByEndpointForUser(
      c.get("authUser").id,
      body.endpoint,
    );
    return c.json({ status: "unsubscribed" as const }, 200);
  });

  app.openapi(adminOverviewRoute, async (c) => {
    const db = adminDb();
    const campaigns = createCampaignRepository(db);
    const [counts, current, open] = await Promise.all([
      createOverviewRepository(db).currentCampaignCounts(),
      campaigns.getCurrent(),
      campaigns.getOpenForRegistration(),
    ]);
    const ref = (row: typeof current) =>
      row ? { id: row.id, slug: row.slug, label: row.label } : null;
    return c.json(
      {
        currentCampaign: ref(current),
        registrationOpenCampaign: ref(open),
        counts: {
          pendingVerification: counts.pendingVerification,
          pendingReview: counts.pendingReview,
          activeMembers: counts.activeMembers,
          newMembers: counts.newMembers,
          returningMembers: counts.returningMembers,
          unrenewedPastMembers: counts.unrenewedPastMembers,
        },
      },
      200,
    );
  });

  app.openapi(adminListRegistrationsRoute, async (c) => {
    const { campaignId, status, q, limit, offset } = c.req.valid("query");
    const result = await registrationService.list({
      campaignId,
      status,
      q,
      limit,
      offset,
    });
    return c.json(result, 200);
  });

  app.openapi(adminGetRegistrationRoute, async (c) => {
    const { id } = c.req.valid("param");
    const detail = await registrationService.detail(id);
    if (!detail) {
      return c.json(
        errorBody(
          c.get("requestId"),
          "NOT_FOUND",
          "No registration with that id.",
        ),
        404,
      );
    }
    return c.json(detail, 200);
  });

  app.openapi(adminRestoreRegistrationRoute, async (c) => {
    const { id } = c.req.valid("param");
    try {
      await registrationService.restore(id, {
        reviewerId: c.get("authUser").id,
      });
      return c.json({ status: "restored" as const }, 200);
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
            "The registration is not in the rejected state.",
          ),
          409,
        );
      }
      throw error;
    }
  });

  app.openapi(adminAcceptRegistrationRoute, async (c) => {
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    try {
      const result = await registrationService.accept(id, {
        ...body,
        reviewerId: c.get("authUser").id,
      });
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
      const result = await registrationService.reject(id, {
        ...body,
        reviewerId: c.get("authUser").id,
      });
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

  // --- Admin: campaigns --------------------------------------------------

  // Drizzle (0.45) wraps driver errors, so the Postgres SQLSTATE can be on
  // the thrown error itself or on its `cause`.
  const pgErrorCode = (error: unknown): string | undefined => {
    for (let e: unknown = error, i = 0; e && i < 4; i += 1) {
      if (typeof e === "object" && e !== null && "code" in e) {
        const code = (e as { code?: unknown }).code;
        if (typeof code === "string") return code;
      }
      e =
        typeof e === "object" && e !== null && "cause" in e
          ? (e as { cause?: unknown }).cause
          : undefined;
    }
    return undefined;
  };
  const isUniqueViolation = (error: unknown) => pgErrorCode(error) === "23505";
  const isCheckViolation = (error: unknown) => pgErrorCode(error) === "23514";
  const noSuchCampaign = (c: Parameters<typeof errorBody>[0]) =>
    errorBody(c, "NOT_FOUND", "No campaign with that id.");

  app.openapi(adminListCampaignsRoute, async (c) => {
    const { q, state, limit, offset } = c.req.valid("query");
    const { rows, total } = await createCampaignRepository(
      adminDb(),
    ).listWithCounts({ q, state, limit, offset });
    return c.json(
      {
        rows: rows.map((row) => ({
          ...toCampaignView(row),
          activeMembers: row.activeMembers,
          pendingReview: row.pendingReview,
        })),
        total,
        limit,
        offset,
      },
      200,
    );
  });

  app.openapi(adminCreateCampaignRoute, async (c) => {
    const body = c.req.valid("json");
    try {
      const created = await createCampaignRepository(adminDb()).create({
        slug: body.slug,
        label: body.label,
        membershipStartsAt: new Date(body.membershipStartsAt),
        membershipEndsAt: new Date(body.membershipEndsAt),
        registrationOpensAt: new Date(body.registrationOpensAt),
        registrationClosesAt: new Date(body.registrationClosesAt),
      });
      return c.json(toCampaignView(created), 201);
    } catch (error) {
      if (isUniqueViolation(error) || isCheckViolation(error)) {
        return c.json(
          errorBody(
            c.get("requestId"),
            "CONFLICT",
            "The slug is already taken or the date ranges are invalid.",
          ),
          409,
        );
      }
      throw error;
    }
  });

  app.openapi(adminUpdateCampaignRoute, async (c) => {
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    try {
      const updated = await createCampaignRepository(adminDb()).update(id, {
        slug: body.slug,
        label: body.label,
        membershipStartsAt: body.membershipStartsAt
          ? new Date(body.membershipStartsAt)
          : undefined,
        membershipEndsAt: body.membershipEndsAt
          ? new Date(body.membershipEndsAt)
          : undefined,
        registrationOpensAt: body.registrationOpensAt
          ? new Date(body.registrationOpensAt)
          : undefined,
        registrationClosesAt: body.registrationClosesAt
          ? new Date(body.registrationClosesAt)
          : undefined,
      });
      return c.json(toCampaignView(updated), 200);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return c.json(noSuchCampaign(c.get("requestId")), 404);
      }
      if (error instanceof IllegalTransitionError) {
        return c.json(
          errorBody(c.get("requestId"), "CONFLICT", error.message),
          409,
        );
      }
      if (isUniqueViolation(error) || isCheckViolation(error)) {
        return c.json(
          errorBody(
            c.get("requestId"),
            "CONFLICT",
            "The slug is already taken or the date ranges are invalid.",
          ),
          409,
        );
      }
      throw error;
    }
  });

  app.openapi(adminSetCampaignRegistrationRoute, async (c) => {
    const { id } = c.req.valid("param");
    const { open } = c.req.valid("json");
    const campaigns = createCampaignRepository(adminDb());
    try {
      let row;
      if (open) {
        row = await campaigns.switchRegistrationOpen(id);
      } else {
        const existing = await campaigns.getById(id);
        if (!existing) throw new NotFoundError("No campaign with that id.");
        await campaigns.unsetRegistrationOpen(id);
        row = (await campaigns.getById(id)) ?? existing;
      }
      return c.json(toCampaignView(row), 200);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return c.json(noSuchCampaign(c.get("requestId")), 404);
      }
      throw error;
    }
  });

  app.openapi(adminSetCampaignCurrentRoute, async (c) => {
    const { id } = c.req.valid("param");
    try {
      const row = await createCampaignRepository(adminDb()).switchCurrent(id);
      return c.json(toCampaignView(row), 200);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return c.json(noSuchCampaign(c.get("requestId")), 404);
      }
      throw error;
    }
  });

  app.openapi(adminArchiveCampaignRoute, async (c) => {
    const { id } = c.req.valid("param");
    try {
      const row = await createCampaignRepository(adminDb()).archive(id);
      return c.json(toCampaignView(row), 200);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return c.json(noSuchCampaign(c.get("requestId")), 404);
      }
      throw error;
    }
  });

  // --- Admin: members -------------------------------------------------

  // CSV export of a campaign's members. A plain route rather than an
  // `app.openapi(...)` one: the body is text/csv, and openapi-fetch would try
  // to JSON-parse it. The admin app hits this same-origin (`/api/v1/...`) so
  // the session cookie rides along; `requireCapability("members.read")` is
  // registered on the path above. No `campaignId` means the current campaign.
  app.get("/v1/admin/members/export", async (c) => {
    const campaigns = createCampaignRepository(adminDb());
    const requested = c.req.query("campaignId");
    const campaign = requested
      ? await campaigns.getById(requested)
      : await campaigns.getCurrent();

    if (!campaign) {
      return c.json(
        errorBody(
          c.get("requestId"),
          requested ? "NOT_FOUND" : "CONFLICT",
          requested
            ? "No campaign with that id."
            : "No campaign is current; pass campaignId to choose one.",
        ),
        requested ? 404 : 409,
      );
    }

    const rows = await createMemberRepository(adminDb()).exportForCampaign(
      campaign.id,
    );
    c.header("Content-Type", "text/csv; charset=utf-8");
    c.header(
      "Content-Disposition",
      `attachment; filename="${membersCsvFilename(campaign.slug)}"`,
    );
    return c.body(membersCsv(rows));
  });

  app.openapi(adminListMembersRoute, async (c) => {
    const { q, filter, limit, offset } = c.req.valid("query");
    const pageLimit = limit ?? 25;
    const pageOffset = offset ?? 0;
    const { rows, total } = await createMemberRepository(adminDb()).list({
      q,
      filter,
      limit: pageLimit,
      offset: pageOffset,
    });
    return c.json({ rows, total, limit: pageLimit, offset: pageOffset }, 200);
  });

  app.openapi(adminGetMemberRoute, async (c) => {
    const { userId } = c.req.valid("param");
    const db = adminDb();
    const members = createMemberRepository(db);
    const profile = await members.getProfile(userId);
    if (!profile) {
      return c.json(
        errorBody(c.get("requestId"), "NOT_FOUND", "No member with that id."),
        404,
      );
    }
    const [memberships, events] = await Promise.all([
      createMembershipRepository(db).listForUser(userId),
      createMembershipEventRepository(db).listForUser(userId),
    ]);
    return c.json(toMemberDetail(profile, memberships, events), 200);
  });

  type ResolvedMembership =
    | { ok: true; membershipId: string }
    | { ok: false; error: "no-current" | "no-membership" };

  async function currentMembership(
    userId: string,
  ): Promise<ResolvedMembership> {
    const db = adminDb();
    const campaign = await createCampaignRepository(db).getCurrent();
    if (!campaign) return { ok: false, error: "no-current" };
    const membershipRow = await createMembershipRepository(
      db,
    ).getForUserAndCampaign(userId, campaign.id);
    if (!membershipRow) return { ok: false, error: "no-membership" };
    return { ok: true, membershipId: membershipRow.id };
  }

  function memberActionError(
    requestIdValue: string,
    error: "no-current" | "no-membership",
  ) {
    return error === "no-current"
      ? {
          body: errorBody(
            requestIdValue,
            "CONFLICT",
            "No campaign is current.",
          ),
          status: 409 as const,
        }
      : {
          body: errorBody(
            requestIdValue,
            "NOT_FOUND",
            "This member has no membership in the current campaign.",
          ),
          status: 404 as const,
        };
  }

  app.openapi(adminMemberLeaveRoute, async (c) => {
    const { userId } = c.req.valid("param");
    const { reason } = c.req.valid("json");
    const resolved = await currentMembership(userId);
    if (!resolved.ok) {
      const { body, status } = memberActionError(
        c.get("requestId"),
        resolved.error,
      );
      return c.json(body, status);
    }
    try {
      await createMembershipRepository(adminDb()).leave(resolved.membershipId, {
        actorId: c.get("authUser").id,
        reason,
      });
      return c.json({ status: "left" as const }, 200);
    } catch (error) {
      if (error instanceof IllegalTransitionError) {
        return c.json(
          errorBody(
            c.get("requestId"),
            "CONFLICT",
            "This membership is not active.",
          ),
          409,
        );
      }
      throw error;
    }
  });

  app.openapi(adminMemberKickRoute, async (c) => {
    const { userId } = c.req.valid("param");
    const { reason } = c.req.valid("json");
    const resolved = await currentMembership(userId);
    if (!resolved.ok) {
      const { body, status } = memberActionError(
        c.get("requestId"),
        resolved.error,
      );
      return c.json(body, status);
    }
    try {
      await createMembershipRepository(adminDb()).kick(resolved.membershipId, {
        actorId: c.get("authUser").id,
        reason,
      });
    } catch (error) {
      if (error instanceof IllegalTransitionError) {
        return c.json(
          errorBody(
            c.get("requestId"),
            "CONFLICT",
            "This membership is not active.",
          ),
          409,
        );
      }
      throw error;
    }
    // The status change stands regardless of whether revocation itself
    // throws; log and move on.
    try {
      await revokeAllUserSessions(authInstance(), userId);
    } catch (error) {
      logger.error(`[${c.get("requestId")}] failed to revoke sessions`, error);
    }
    return c.json({ status: "kicked" as const }, 200);
  });

  app.openapi(adminMemberRestoreRoute, async (c) => {
    const { userId } = c.req.valid("param");
    const resolved = await currentMembership(userId);
    if (!resolved.ok) {
      const { body, status } = memberActionError(
        c.get("requestId"),
        resolved.error,
      );
      return c.json(body, status);
    }
    try {
      await createMembershipRepository(adminDb()).restore(
        resolved.membershipId,
        { actorId: c.get("authUser").id },
      );
      return c.json({ status: "restored" as const }, 200);
    } catch (error) {
      if (error instanceof IllegalTransitionError) {
        return c.json(
          errorBody(
            c.get("requestId"),
            "CONFLICT",
            "This membership is not in a left or kicked state.",
          ),
          409,
        );
      }
      throw error;
    }
  });

  app.openapi(adminMemberSetRoleRoute, async (c) => {
    const { userId } = c.req.valid("param");
    const { role } = c.req.valid("json");
    const db = adminDb();
    const updated = await createMemberRepository(db).setRole(userId, role);
    if (!updated) {
      return c.json(
        errorBody(c.get("requestId"), "NOT_FOUND", "No member with that id."),
        404,
      );
    }
    await createMembershipEventRepository(db).record({
      eventType: "role_changed",
      targetUserId: userId,
      actorId: c.get("authUser").id,
      campaignId: null,
      details: { role },
    });
    return c.json({ role: updated.role ?? role }, 200);
  });

  // --- Admin: invitations --------------------------------------------

  app.openapi(adminListInvitationsRoute, async (c) => {
    const { campaignId, q, status, limit, offset } = c.req.valid("query");
    return c.json(
      await invitationService.listPage({ campaignId, q, status, limit, offset }),
      200,
    );
  });

  app.openapi(adminCreateInvitationRoute, async (c) => {
    const body = c.req.valid("json");
    const requestId = c.get("requestId");

    if (
      body.intendedRole === "admin" &&
      !can(
        { user: { role: c.get("authUser").role } },
        "invitations.grant_admin",
      )
    ) {
      return c.json(
        errorBody(
          requestId,
          "FORBIDDEN",
          "You cannot invite someone as an admin.",
        ),
        403,
      );
    }

    const domain = body.email.split("@").at(-1) ?? "";
    const isUdl = domain === "udl.cat" || domain.endsWith(".udl.cat");
    if (!isUdl && !body.allowExternalDomain) {
      return c.json(
        errorBody(
          requestId,
          "CONFLICT",
          `The address is not a udl.cat address (${domain}). Resend with allowExternalDomain: true to confirm.`,
        ),
        409,
      );
    }

    const existing = await invitationService.listByCampaign(body.campaignId);
    if (
      existing.some(
        (row) =>
          row.email === body.email && row.status === "pending" && !row.expired,
      )
    ) {
      return c.json(
        errorBody(
          requestId,
          "CONFLICT",
          "A pending invitation for this email and campaign already exists.",
        ),
        409,
      );
    }

    const created = await invitationService.create({
      campaignId: body.campaignId,
      email: body.email,
      inviterId: c.get("authUser").id,
      intendedRole: body.intendedRole,
      prefillName: body.prefillName,
      prefillSurnames: body.prefillSurnames,
    });
    return c.json(created, 201);
  });

  app.openapi(adminResendInvitationRoute, async (c) => {
    const { id } = c.req.valid("param");
    try {
      await invitationService.resend(id);
      return c.json({ status: "ok" as const }, 200);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return c.json(
          errorBody(
            c.get("requestId"),
            "NOT_FOUND",
            "No invitation with that id.",
          ),
          404,
        );
      }
      if (error instanceof IllegalTransitionError) {
        return c.json(
          errorBody(
            c.get("requestId"),
            "CONFLICT",
            "The invitation is not pending.",
          ),
          409,
        );
      }
      throw error;
    }
  });

  app.openapi(adminCancelInvitationRoute, async (c) => {
    const { id } = c.req.valid("param");
    try {
      await invitationService.cancel(id);
      return c.json({ status: "ok" as const }, 200);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return c.json(
          errorBody(
            c.get("requestId"),
            "NOT_FOUND",
            "No invitation with that id.",
          ),
          404,
        );
      }
      if (error instanceof IllegalTransitionError) {
        return c.json(
          errorBody(
            c.get("requestId"),
            "CONFLICT",
            "The invitation is not pending.",
          ),
          409,
        );
      }
      throw error;
    }
  });

  // --- Public: invitation onboarding --------------------------------

  function ipOf(header: string | undefined): string {
    return header?.split(",")[0]?.trim() || "unknown";
  }

  app.openapi(invitationLookupRoute, async (c) => {
    const ip = ipOf(c.req.header("x-forwarded-for"));
    if (!allowRequest(`inv-lookup:${ip}`, 30, 60_000)) {
      return c.json(
        errorBody(
          c.get("requestId"),
          "CONFLICT",
          "Too many requests. Try again soon.",
        ),
        429,
      );
    }
    const { token } = c.req.valid("json");
    const result = await invitationService.lookup(token);
    if (!result) {
      return c.json(
        errorBody(
          c.get("requestId"),
          "INVALID_TOKEN",
          "This invitation link is invalid, expired, or already used.",
        ),
        400,
      );
    }
    return c.json(
      {
        email: result.email,
        prefillName: result.prefillName,
        prefillSurnames: result.prefillSurnames,
        campaignLabel: result.campaignLabel,
      },
      200,
    );
  });

  app.openapi(invitationAcceptRoute, async (c) => {
    const ip = ipOf(c.req.header("x-forwarded-for"));
    if (!allowRequest(`inv-accept:${ip}`, 10, 60_000)) {
      return c.json(
        errorBody(
          c.get("requestId"),
          "CONFLICT",
          "Too many attempts. Try again soon.",
        ),
        429,
      );
    }
    const body = c.req.valid("json");
    // `invitationAcceptBodySchema.phone` already `.refine(isValidPhone)`d,
    // so this parse cannot realistically fail — defensive only.
    const phone = parsePhone(body.phone);
    if (!phone) throw new Error("phone failed to parse after validation");
    try {
      const result = await invitationService.accept(body.token, {
        name: body.name,
        surnames: body.surnames,
        phoneE164: phone.e164,
        phoneDisplay: phone.display,
        degree: body.degree,
        studyYear: body.year,
      });
      if (!result.alreadyMember) {
        void pushNotifier.notifyAdmins({
          title: "Nou membre",
          body: `${body.name} ${body.surnames} s'ha unit a l'equip.`,
          url: "/members",
          tag: "member-joined",
        });
      }
      return c.json(
        { status: "accepted" as const, alreadyMember: result.alreadyMember },
        200,
      );
    } catch (error) {
      if (error instanceof IllegalTransitionError) {
        return c.json(
          errorBody(
            c.get("requestId"),
            "INVALID_TOKEN",
            "This invitation link is invalid, expired, or already used.",
          ),
          400,
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
