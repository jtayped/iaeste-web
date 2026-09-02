import { OpenAPIHono } from "@hono/zod-openapi";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { requestId } from "hono/request-id";
import { secureHeaders } from "hono/secure-headers";

import { can, revokeAllUserSessions, type Auth } from "@repo/auth";
import type { Database } from "@repo/db/client";
import { parsePhone } from "@repo/constants/validators/phone";
import {
  memberProfileSchema,
  registrationSchema,
} from "@repo/constants/validators/registration";
import { getDb } from "@repo/db/client";
import {
  createCampaignRepository,
  createMemberErasureRepository,
  createMemberRepository,
  createMembershipEventRepository,
  createMembershipRepository,
  createOverviewRepository,
  createPushSubscriptionRepository,
  createUserEmailRepository,
  DuplicateEmailSlotsError,
  IllegalTransitionError,
  EmailAddressInUseError,
  EmailIdentityConflictError,
  LastEmailRemovalError,
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
import { toMemberDetail, toOwnProfile } from "./lib/member-detail";
import { allowRequest } from "./lib/rate-limit";
import {
  createInvitationService,
  type InvitationService,
} from "./services/invitation-service";
import {
  createRegistrationChallengeService,
  type RegistrationChallengeService,
} from "./services/registration-challenge-service";
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
  adminBulkCreateInvitationsRoute,
  adminCreateCampaignRoute,
  adminCancelInvitationRoute,
  adminCreateInvitationRoute,
  adminDeleteMemberRoute,
  adminGetOwnProfileRoute,
  adminGetMemberRoute,
  adminGetRegistrationRoute,
  adminListInvitationsRoute,
  adminListCampaignsRoute,
  adminListMembersRoute,
  adminMemberKickRoute,
  adminMemberLeaveRoute,
  adminMemberRestoreRoute,
  adminMemberSetRoleRoute,
  adminSetMemberEmailsRoute,
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
  adminUpdateOwnProfileRoute,
  adminRejectRegistrationRoute,
  createRegistrationRoute,
  healthRoute,
  registrationStatusRoute,
  startRegistrationRoute,
  verifyRegistrationCodeRoute,
  verifyRegistrationDraftLinkRoute,
  resumeRegistrationDraftRoute,
  resendRegistrationDraftLinkRoute,
  resendVerificationRoute,
  invitationAcceptRoute,
  invitationLookupRoute,
  verifyRegistrationGetRoute,
  verifyRegistrationPostRoute,
} from "./routes";
import type { PublicRegistrationStatus } from "./contracts";
import {
  createDrizzleRegistrationService,
  type RegistrationService,
} from "./services/registration-service";
import { API_VERSION } from "./version";

type AppDependencies = {
  getRegistrationStatus?: () => Promise<PublicRegistrationStatus>;
  logger?: Pick<Console, "error"> & Partial<Pick<Console, "warn">>;
  registrationRepository?: RegistrationRepository;
  registrationService?: RegistrationService;
  registrationChallengeService?: RegistrationChallengeService;
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
  const getRegistrationStatus =
    dependencies.getRegistrationStatus ??
    (async (): Promise<PublicRegistrationStatus> => {
      const campaigns = createCampaignRepository(getDb());
      // `isRegistrationOpen` stays the only thing that decides *open*; the
      // timestamps are read alongside it purely so the public site can count
      // down. When nothing is open, the soonest upcoming campaign is what
      // that countdown targets.
      const campaign =
        (await campaigns.getOpenForRegistration()) ??
        (await campaigns.getNextForRegistration());
      return {
        open: campaign?.isRegistrationOpen ?? false,
        opensAt: campaign?.registrationOpensAt.toISOString() ?? null,
        closesAt: campaign?.registrationClosesAt.toISOString() ?? null,
      };
    });
  const registrationRepository =
    dependencies.registrationRepository ??
    createDrizzleRegistrationRepository();
  const registrationService =
    dependencies.registrationService ?? createDrizzleRegistrationService();
  const challengeService =
    dependencies.registrationChallengeService ??
    createRegistrationChallengeService({ db: dependencies.db });
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

  /** First hop only — everything after it is client-supplied and unusable. */
  function ipOf(header: string | undefined): string {
    return header?.split(",")[0]?.trim() || "unknown";
  }

  app.openapi(healthRoute, (c) =>
    c.json({ status: "ok" as const, version: API_VERSION }, 200),
  );

  app.openapi(registrationStatusRoute, async (c) =>
    c.json(await getRegistrationStatus(), 200),
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
  app.on(
    ["GET", "POST", "PUT", "PATCH", "DELETE"],
    "/api/auth/*",
    async (c) => {
      const auth = dependencies.auth ?? getAuth();
      const request = c.req.raw;
      if (
        request.method === "POST" &&
        new URL(request.url).pathname.endsWith("/sign-in/magic-link")
      ) {
        const body = (await request.clone().json()) as {
          email?: unknown;
          metadata?: unknown;
          [key: string]: unknown;
        };
        if (typeof body.email === "string") {
          const requestedEmail = body.email.trim().toLowerCase();
          const alias =
            await createUserEmailRepository(adminDb()).resolveVerified(
              requestedEmail,
            );
          if (alias) {
            body.email = alias.canonicalEmail;
            body.metadata = { iaesteDeliveryEmail: alias.email };
          } else {
            body.email = requestedEmail;
            delete body.metadata;
          }
          const headers = new Headers(request.headers);
          const rewritten = new Request(request.url, {
            method: request.method,
            headers,
            body: JSON.stringify(body),
          });
          return auth.handler(rewritten);
        }
      }
      return auth.handler(request);
    },
  );

  // Step one of the public form. See startRegistrationRoute's doc comment:
  // the 200 says nothing about whether an email went out, and the only
  // condition allowed to change the answer is the campaign calendar.
  app.openapi(startRegistrationRoute, async (c) => {
    const { email } = c.req.valid("json");
    const ip = ipOf(c.req.header("x-forwarded-for"));
    // A client-side limit on top of the per-address one inside the service,
    // so a single machine cannot walk a list of addresses to farm codes.
    if (!allowRequest(`reg-start:${ip}`, 20, 60_000)) {
      return c.json(
        errorBody(
          c.get("requestId"),
          "CONFLICT",
          "Too many requests. Try again soon.",
        ),
        429,
      );
    }

    try {
      const { resendAfterSeconds } = await challengeService.start(email);
      return c.json({ status: "ok" as const, resendAfterSeconds }, 200);
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
      throw error;
    }
  });

  app.openapi(verifyRegistrationCodeRoute, async (c) => {
    const { email, code } = c.req.valid("json");
    const ip = ipOf(c.req.header("x-forwarded-for"));
    if (!allowRequest(`reg-code:${ip}`, 30, 60_000)) {
      return c.json(
        errorBody(
          c.get("requestId"),
          "CONFLICT",
          "Too many attempts. Try again soon.",
        ),
        429,
      );
    }

    let session;
    try {
      session = await challengeService.verifyCode(email, code);
    } catch (error) {
      if (error instanceof EmailIdentityConflictError) {
        return c.json(
          errorBody(
            c.get("requestId"),
            "CONFLICT",
            "This address belongs to more than one member account.",
          ),
          409,
        );
      }
      throw error;
    }
    if (!session) {
      return c.json(
        errorBody(
          c.get("requestId"),
          "INVALID_TOKEN",
          "This code is invalid, expired, or already used.",
        ),
        400,
      );
    }

    return c.json(serialiseDraftSession(session), 200);
  });

  function serialiseDraftSession(
    session: Awaited<ReturnType<typeof challengeService.resume>> extends infer T
      ? NonNullable<T>
      : never,
  ) {
    return {
      token: session.token,
      expiresAt: session.expiresAt.toISOString(),
      ready: session.ready,
      emails: session.emails,
      known: session.known,
      profile: session.profile,
      memberships: session.memberships.map((row) => ({
        campaignLabel: row.campaignLabel,
        status: row.status as "active" | "left" | "kicked",
      })),
      openCampaignRegistrationStatus: session.openCampaignRegistrationStatus,
      willAutoAccept: session.willAutoAccept,
    };
  }

  app.openapi(verifyRegistrationDraftLinkRoute, async (c) => {
    const { token } = c.req.valid("json");
    const ip = ipOf(c.req.header("x-forwarded-for"));
    if (!allowRequest(`reg-link:${ip}`, 30, 60_000)) {
      return c.json(
        errorBody(
          c.get("requestId"),
          "CONFLICT",
          "Too many attempts. Try again soon.",
        ),
        429,
      );
    }

    let session;
    try {
      session = await challengeService.verifyLink(token);
    } catch (error) {
      if (error instanceof EmailIdentityConflictError) {
        return c.json(
          errorBody(
            c.get("requestId"),
            "CONFLICT",
            "These addresses belong to different member accounts.",
          ),
          409,
        );
      }
      throw error;
    }
    if (!session) {
      return c.json(
        errorBody(
          c.get("requestId"),
          "INVALID_TOKEN",
          "This link is invalid, expired, or already used.",
        ),
        400,
      );
    }

    return c.json(serialiseDraftSession(session), 200);
  });

  app.openapi(resumeRegistrationDraftRoute, async (c) => {
    const { token } = c.req.valid("json");
    try {
      const session = await challengeService.resume(token);
      if (session) return c.json(serialiseDraftSession(session), 200);
    } catch (error) {
      if (error instanceof EmailIdentityConflictError) {
        return c.json(
          errorBody(
            c.get("requestId"),
            "CONFLICT",
            "These addresses belong to different member accounts.",
          ),
          409,
        );
      }
      throw error;
    }
    return c.json(
      errorBody(
        c.get("requestId"),
        "INVALID_TOKEN",
        "This registration session is invalid or expired.",
      ),
      400,
    );
  });

  app.openapi(resendRegistrationDraftLinkRoute, async (c) => {
    const { token, kind } = c.req.valid("json");
    await challengeService.resendLink(token, kind);
    return c.json(
      {
        status: "ok" as const,
        resendAfterSeconds: 60,
      },
      200,
    );
  });

  app.openapi(createRegistrationRoute, async (c) => {
    const body = c.req.valid("json");

    // The address comes from the session, never from the body. Only read
    // here, not spent: a 500 from the write below must leave the session
    // usable, or a transient database failure costs the applicant everything
    // they typed. Two concurrent submissions are made safe by the unique
    // index on (campaign, email) instead, which is where the guarantee
    // actually belongs.
    const draft = await challengeService.resolveSession(body.emailToken);
    if (!draft) {
      return c.json(
        errorBody(
          c.get("requestId"),
          "INVALID_TOKEN",
          "This registration session is invalid, expired, or already used.",
        ),
        400,
      );
    }

    const parsed = registrationSchema.safeParse({ ...body, ...draft });
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
      // Spent only now that the row exists, so the token cannot be replayed
      // but also cannot be lost to a failure that was never the user's.
      await challengeService.consumeSession(body.emailToken);
      // Previously fired when the applicant clicked the verification link.
      // The address is proven before submission now, so the moment a row
      // appears is the moment the committee has something to review.
      if (created.outcome === "pending_review") {
        void pushNotifier.notifyAdmins({
          title: "Nova sol·licitud",
          body: `${parsed.data.name} ${parsed.data.surnames} espera revisió.`,
          url: "/registrations",
          tag: "registration-review",
        });
      }
      return c.json(
        {
          status: "created" as const,
          id: created.id,
          outcome: created.outcome,
        },
        201,
      );
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

  app.use("/v1/admin/profile", requireCapability("admin.access"));
  app.use("/v1/admin/overview", requireCapability("dashboard.read"));
  app.use(
    "/v1/admin/push/public-key",
    requireCapability("notifications.manage"),
  );
  app.use(
    "/v1/admin/push/subscribe",
    requireCapability("notifications.manage"),
  );
  app.use(
    "/v1/admin/push/unsubscribe",
    requireCapability("notifications.manage"),
  );
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
  // DELETE on the same path is the irreversible erasure — it needs the
  // stricter capability on top of `members.read`. Method-scoped so a plain
  // GET of a member is unaffected.
  app.on(
    "DELETE",
    "/v1/admin/members/:userId",
    requireCapability("members.delete"),
  );
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
  app.use(
    "/v1/admin/members/:userId/emails",
    requireCapability("members.email.write"),
  );
  app.use("/v1/admin/invitations", requireCapability("invitations.write"));
  app.use("/v1/admin/invitations/bulk", requireCapability("invitations.write"));
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

  app.openapi(adminGetOwnProfileRoute, async (c) => {
    const userId = c.get("authUser").id;
    const db = adminDb();
    const profile = await createMemberRepository(db).getProfile(userId);
    if (!profile) {
      return c.json(
        errorBody(c.get("requestId"), "NOT_FOUND", "No member profile."),
        404,
      );
    }

    const emails = await createUserEmailRepository(db).listForUser(userId);
    return c.json(toOwnProfile(profile, emails), 200);
  });

  app.openapi(adminUpdateOwnProfileRoute, async (c) => {
    const userId = c.get("authUser").id;
    // The OpenAPI copy carries field metadata, while this shared schema is
    // the domain authority used by the registration form too.
    const parsed = memberProfileSchema.safeParse(c.req.valid("json"));
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
    const body = parsed.data;
    const phone = parsePhone(body.phone);
    if (!phone) throw new Error("phone failed to parse after validation");

    const db = adminDb();
    const profile = await createMemberRepository(db).updateProfile(userId, {
      ...body,
      phoneE164: phone.e164,
      phoneDisplay: phone.display,
    });
    if (!profile) {
      return c.json(
        errorBody(c.get("requestId"), "NOT_FOUND", "No member profile."),
        404,
      );
    }

    const emails = await createUserEmailRepository(db).listForUser(userId);
    return c.json(toOwnProfile(profile, emails), 200);
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
    const { q, filter, campaignId, targetCampaignId, limit, offset } =
      c.req.valid("query");
    const pageLimit = limit ?? 25;
    const pageOffset = offset ?? 0;
    const { rows, total, inviteEligibleTotal } = await createMemberRepository(
      adminDb(),
    ).list({
      q,
      filter,
      campaignId,
      targetCampaignId,
      limit: pageLimit,
      offset: pageOffset,
    });
    return c.json(
      {
        rows,
        total,
        inviteEligibleTotal,
        limit: pageLimit,
        offset: pageOffset,
      },
      200,
    );
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
    const [emails, memberships, events] = await Promise.all([
      createUserEmailRepository(db).listForUser(userId),
      createMembershipRepository(db).listForUser(userId),
      createMembershipEventRepository(db).listForUser(userId),
    ]);
    return c.json(toMemberDetail(profile, emails, memberships, events), 200);
  });

  app.openapi(adminSetMemberEmailsRoute, async (c) => {
    const { userId } = c.req.valid("param");
    const body = c.req.valid("json");
    const db = adminDb();
    // Same "is this actually a member" gate the rest of the fitxa uses.
    const profile = await createMemberRepository(db).getProfile(userId);
    if (!profile) {
      return c.json(
        errorBody(c.get("requestId"), "NOT_FOUND", "No member with that id."),
        404,
      );
    }
    try {
      const emails = await createUserEmailRepository(db).setForUser(
        userId,
        body,
      );
      // Changing a sign-in identity invalidates every existing login for that
      // member. The email edit has already committed, so match the kick flow:
      // report a revocation failure without pretending the address update
      // rolled back.
      try {
        await revokeAllUserSessions(authInstance(), userId);
      } catch (error) {
        logger.error(
          `[${c.get("requestId")}] failed to revoke sessions after email change`,
          error,
        );
      }
      return c.json({ emails }, 200);
    } catch (error) {
      if (error instanceof EmailAddressInUseError) {
        return c.json(
          errorBody(
            c.get("requestId"),
            "CONFLICT",
            "That address is already linked to another account.",
          ),
          409,
        );
      }
      if (error instanceof LastEmailRemovalError) {
        return c.json(
          errorBody(
            c.get("requestId"),
            "CONFLICT",
            "A member must keep at least one email address.",
          ),
          409,
        );
      }
      if (error instanceof DuplicateEmailSlotsError) {
        return c.json(
          errorBody(
            c.get("requestId"),
            "VALIDATION_ERROR",
            "The university and personal addresses must differ.",
          ),
          422,
        );
      }
      throw error;
    }
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

  // Irreversible, total erasure — distinct from leave/kick, which keep the
  // account and the history. `member-erasure.ts` does every delete in one
  // transaction; here we just map "no such user" to a 404 and then make a
  // best-effort pass to drop any session Better Auth might still hold.
  app.openapi(adminDeleteMemberRoute, async (c) => {
    const { userId } = c.req.valid("param");
    try {
      const result =
        await createMemberErasureRepository(adminDb()).eraseUser(userId);
      // The only trace this action leaves: the target's own audit rows are
      // destroyed with them, so who-erased-whom lives in the log stream, not
      // the database. `warn` (not `error`) so it stands out without paging.
      logger.warn?.(`[${c.get("requestId")}] admin erased user`, {
        actorId: c.get("authUser").id,
        actorEmail: c.get("authUser").email,
        targetUserId: result.userId,
        targetEmail: result.email,
        deleted: result.deleted,
      });
      try {
        await revokeAllUserSessions(authInstance(), userId);
      } catch (error) {
        logger.error(
          `[${c.get("requestId")}] failed to revoke sessions after erasure`,
          error,
        );
      }
      return c.json(result, 200);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return c.json(
          errorBody(c.get("requestId"), "NOT_FOUND", "No user with that id."),
          404,
        );
      }
      throw error;
    }
  });

  // --- Admin: invitations --------------------------------------------

  app.openapi(adminListInvitationsRoute, async (c) => {
    const { campaignId, q, status, limit, offset } = c.req.valid("query");
    return c.json(
      await invitationService.listPage({
        campaignId,
        q,
        status,
        limit,
        offset,
      }),
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

  app.openapi(adminBulkCreateInvitationsRoute, async (c) => {
    const { campaignId, selection } = c.req.valid("json");
    const requestId = c.get("requestId");
    const db = adminDb();

    if (!(await createCampaignRepository(db).getById(campaignId))) {
      return c.json(
        errorBody(requestId, "NOT_FOUND", "No campaign with that id."),
        404,
      );
    }

    const members = await createMemberRepository(db).listInvitationSelection(
      selection,
      campaignId,
      201,
    );
    if (members.length > 200) {
      return c.json(
        errorBody(
          requestId,
          "CONFLICT",
          "A bulk invitation can contain at most 200 members. Narrow the table filters and try again.",
        ),
        409,
      );
    }

    const skipped = { member: 0, registered: 0, invited: 0 };
    let created = 0;

    for (const member of members) {
      if (member.targetState !== "eligible") {
        skipped[member.targetState] += 1;
        continue;
      }

      await invitationService.create({
        campaignId,
        email: member.email,
        inviterId: c.get("authUser").id,
        intendedRole: "member",
        prefillName: member.name,
        prefillSurnames: member.surnames,
      });
      created += 1;
    }

    return c.json({ requested: members.length, created, skipped }, 201);
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
        known: result.known,
        profile: result.profile,
        memberships: result.memberships.map((row) => ({
          campaignLabel: row.campaignLabel,
          status: row.status as "active" | "left" | "kicked",
        })),
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
        ...(body.note ? { note: body.note } : {}),
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
