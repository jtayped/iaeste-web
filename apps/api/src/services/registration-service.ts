import crypto from "node:crypto";

import { getDb } from "@repo/db/client";
import { eq } from "drizzle-orm";

import {
  createCampaignRepository,
  createMembershipRepository,
  createRegistrationRepository,
  createRegistrationVerificationRepository,
  IllegalTransitionError,
  type RegistrationProfileSnapshot,
  type RegistrationStatus,
} from "@repo/db/repositories";
import { registration as registrationTable, user } from "@repo/db/schema";
import MembershipAccepted from "@repo/email/acceptance";
import RegistrationPending from "@repo/email/pending-review";
import MembershipRejected from "@repo/email/rejection";
import { createResendEmailer, type Emailer } from "@repo/email/resend";
import VerifyUserEmail from "@repo/email/verify-email";

import {
  getAdminPublicOrigin,
  getEmailConfig,
  getInscripcionsPublicOrigin,
} from "../config";
import { canSend, recordSend } from "../lib/rate-limit";
import "../lib/react-global";

// Same TTL as the token generated at initial registration (see
// repositories/registrations.ts) — 24 hours.
const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

let cachedEmailer: Emailer | undefined;

/** Lazily constructed for the same reason `getDb()` is only called per-operation below — see repositories/registrations.ts's doc comment. */
function defaultEmailer(): Emailer {
  if (!cachedEmailer) cachedEmailer = createResendEmailer(getEmailConfig());
  return cachedEmailer;
}

/** Admin-facing view of a registration row — dates as ISO strings, JSON-ready. */
export interface AdminRegistrationView {
  id: string;
  campaignId: string;
  email: string;
  status: RegistrationStatus;
  profileSnapshot: RegistrationProfileSnapshot;
  source: string;
  verifiedAt: string | null;
  reviewedAt: string | null;
  reviewerId: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

interface RegistrationRow {
  id: string;
  campaignId: string;
  email: string;
  status: RegistrationStatus;
  profileSnapshot: unknown;
  source: string;
  verifiedAt: Date | null;
  reviewedAt: Date | null;
  reviewerId: string | null;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

function toView(row: RegistrationRow): AdminRegistrationView {
  return {
    id: row.id,
    campaignId: row.campaignId,
    email: row.email,
    status: row.status,
    profileSnapshot: row.profileSnapshot as RegistrationProfileSnapshot,
    source: row.source,
    verifiedAt: row.verifiedAt ? row.verifiedAt.toISOString() : null,
    reviewedAt: row.reviewedAt ? row.reviewedAt.toISOString() : null,
    reviewerId: row.reviewerId,
    rejectionReason: row.rejectionReason,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export interface AdminPriorMembership {
  campaignId: string;
  campaignSlug: string;
  campaignLabel: string;
  status: string;
  joinedAt: string;
  endedAt: string | null;
}

export interface AdminDuplicateRegistration {
  id: string;
  campaignId: string;
  campaignLabel: string;
  status: RegistrationStatus;
  createdAt: string;
}

export interface AdminRegistrationDetail {
  registration: AdminRegistrationView;
  /** Whether a Better Auth account already exists for this email. */
  existingUserId: string | null;
  priorMemberships: AdminPriorMembership[];
  classification: "new" | "returning";
  duplicateRegistrations: AdminDuplicateRegistration[];
}

export interface AcceptInput {
  reviewerId: string;
  membershipSource?: string;
}

export interface RejectInput {
  reviewerId: string;
  reason: string;
}

export interface AdminRegistrationListParams {
  campaignId: string;
  status?: RegistrationStatus;
  q?: string;
  limit: number;
  offset: number;
}

export interface AdminRegistrationListPage {
  rows: AdminRegistrationView[];
  total: number;
  limit: number;
  offset: number;
}

export interface RegistrationService {
  list(params: AdminRegistrationListParams): Promise<AdminRegistrationListPage>;
  resendVerification(registrationId: string): Promise<void>;
  verify(rawToken: string): Promise<void>;
  accept(
    registrationId: string,
    input: AcceptInput,
  ): Promise<{ notificationSent: boolean }>;
  reject(
    registrationId: string,
    input: RejectInput,
  ): Promise<{ notificationSent: boolean }>;
  restore(registrationId: string, input: { reviewerId: string }): Promise<void>;
  detail(registrationId: string): Promise<AdminRegistrationDetail | undefined>;
}

export interface RegistrationServiceDependencies {
  /** Overridable so tests never need a real `RESEND_API_KEY`. */
  emailer?: Emailer;
  /**
   * Overridable so integration tests can point every method at
   * `iaeste_test`. Defaults to the app-wide `getDb()`.
   */
  db?: import("@repo/db/client").Database;
}

/**
 * Everything IA-40 adds beyond the initial `POST /v1/registrations` write
 * (that one stays in `repositories/registrations.ts`): resending a
 * verification email, consuming a verification token, and the admin
 * list/accept/reject actions. See routes.ts and app.ts for the loud,
 * explicit "unauthenticated by design" warning on the admin methods' HTTP
 * routes — this service itself performs no authorization, by design, per
 * IA-40's scope (real auth is IA-30/IA-31).
 */
export function createDrizzleRegistrationService(
  dependencies: RegistrationServiceDependencies = {},
): RegistrationService {
  const emailer = () => dependencies.emailer ?? defaultEmailer();
  const resolveDb = () => dependencies.db ?? getDb();

  return {
    async list(params) {
      const db = resolveDb();
      const { rows, total } =
        await createRegistrationRepository(db).listForAdmin(params);
      return {
        rows: rows.map(toView),
        total,
        limit: params.limit,
        offset: params.offset,
      };
    },

    /**
     * Always resolves — regardless of whether `registrationId` exists, is
     * in a status a resend makes sense for, or is currently cooling down —
     * so `POST /v1/registrations/:id/resend-verification` can't be used to
     * enumerate registrations or their status through response shape. See
     * routes.ts's doc comment on that route for the full argument.
     */
    async resendVerification(registrationId) {
      const db = resolveDb();
      const registrations = createRegistrationRepository(db);
      const row = await registrations.getById(registrationId);

      if (!row || row.status !== "pending_email") return;
      if (!canSend(registrationId)) return;

      recordSend(registrationId);

      const verifications = createRegistrationVerificationRepository(db);
      // Rotate: invalidate whatever verification token(s) this
      // registration already has outstanding before issuing a new one, so
      // the previous email link actually stops working immediately rather
      // than merely being superseded (see invalidateActiveForRegistration's
      // doc comment in @repo/db).
      await verifications.invalidateActiveForRegistration(registrationId);

      const rawToken = crypto.randomBytes(32).toString("hex");
      await verifications.create({
        registrationId,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS),
      });

      const link = `${getInscripcionsPublicOrigin()}/verificar#token=${rawToken}`;
      try {
        await emailer().send({
          to: row.email,
          subject: "verifica el teu correu · iaeste lc lleida",
          react: VerifyUserEmail({ email: row.email, link }),
        });
      } catch (error) {
        console.error("Failed to resend verification email", error);
      }
    },

    /**
     * Consumes a raw verification token and moves the registration from
     * `pending_email` to `pending_review`. This does NOT create a
     * membership or accept anyone — only the admin `accept()` method below
     * does that. Verifying an email just means the applicant is now
     * waiting on the committee's review.
     */
    async verify(rawToken) {
      const db = resolveDb();
      const tokenHash = hashToken(rawToken);
      const verifications = createRegistrationVerificationRepository(db);
      // Throws IllegalTransitionError for an invalid/expired/already-used
      // token, with a message that is already generic and safe to
      // propagate as-is — it never reveals whether any registration exists.
      const consumed = await verifications.consume(tokenHash);

      const registrations = createRegistrationRepository(db);
      let updated;
      try {
        updated = await registrations.markEmailVerified(
          consumed.registrationId,
        );
      } catch {
        // Collapse any failure here (e.g. a racing second request already
        // verified this registration) into the exact same generic signal a
        // bad token gets — this endpoint must never expose
        // registration-level state (see "no email-existence leakage" in
        // IA-40's task notes).
        throw new IllegalTransitionError(
          "Verification token is invalid, expired, or already used",
        );
      }

      const campaign = await createCampaignRepository(db).getById(
        updated.campaignId,
      );
      const snapshot = updated.profileSnapshot as RegistrationProfileSnapshot;

      try {
        await emailer().send({
          to: updated.email,
          subject: "sol·licitud rebuda · iaeste lc lleida",
          react: RegistrationPending({
            name: snapshot.name,
            email: updated.email,
            campaign: campaign?.label ?? updated.campaignId,
          }),
        });
      } catch (error) {
        // The applicant's email IS verified at this point — a real,
        // completed state change we must not hide or roll back just
        // because the follow-up notification failed to send.
        console.error("Failed to send pending-review email", error);
      }
    },

    async accept(registrationId, input) {
      const db = resolveDb();
      const registrations = createRegistrationRepository(db);
      // Throws NotFoundError | IllegalTransitionError. Unlike the public
      // verify/resend methods above, the admin surface is allowed to
      // distinguish these — the route handler maps them straight to
      // 404 / 409.
      const result = await registrations.accept(registrationId, input);

      const campaign = await createCampaignRepository(db).getById(
        result.registration.campaignId,
      );
      const snapshot = result.registration
        .profileSnapshot as RegistrationProfileSnapshot;

      // Placeholder until IA-30 wires up real magic-link auth: there is no
      // admin app or first-login flow yet, so this just points at where
      // that sign-in page will eventually live. NOT a functional link.
      const loginLink = `${getAdminPublicOrigin()}/entrar?userId=${result.user.id}`;

      let notificationSent = true;
      try {
        await emailer().send({
          to: result.registration.email,
          subject: "ja ets membre · iaeste lc lleida",
          react: MembershipAccepted({
            name: snapshot.name,
            loginLink,
            campaign: campaign?.label ?? result.registration.campaignId,
            via: "registration",
          }),
        });
      } catch (error) {
        // The membership stands regardless — an admin decision that's
        // already landed in Postgres must never be rolled back because the
        // notification email happened to fail.
        console.error("Failed to send acceptance email", error);
        notificationSent = false;
      }

      return { notificationSent };
    },

    async reject(registrationId, input) {
      const db = resolveDb();
      const registrations = createRegistrationRepository(db);
      const result = await registrations.reject(registrationId, input);

      const campaign = await createCampaignRepository(db).getById(
        result.campaignId,
      );
      const snapshot = result.profileSnapshot as RegistrationProfileSnapshot;

      let notificationSent = true;
      try {
        await emailer().send({
          to: result.email,
          subject: "sobre la teva sol·licitud · iaeste lc lleida",
          react: MembershipRejected({
            name: snapshot.name,
            campaign: campaign?.label ?? result.campaignId,
            reason: input.reason,
          }),
        });
      } catch (error) {
        console.error("Failed to send rejection email", error);
        notificationSent = false;
      }

      return { notificationSent };
    },

    async restore(registrationId, input) {
      const db = resolveDb();
      await createRegistrationRepository(db).restore(registrationId, input);
    },

    async detail(registrationId) {
      const db = resolveDb();
      const registrations = createRegistrationRepository(db);
      const row = await registrations.getById(registrationId);
      if (!row) return undefined;

      const campaigns = createCampaignRepository(db);
      const memberships = createMembershipRepository(db);

      const [account] = await db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.email, row.email));

      const priorRows = account
        ? await memberships.listForUser(account.id)
        : [];
      const priorMemberships: AdminPriorMembership[] = priorRows.map((r) => ({
        campaignId: r.campaign.id,
        campaignSlug: r.campaign.slug,
        campaignLabel: r.campaign.label,
        status: r.membership.status,
        joinedAt: r.membership.joinedAt.toISOString(),
        endedAt: r.membership.endedAt
          ? r.membership.endedAt.toISOString()
          : null,
      }));

      const sameEmail = await db
        .select()
        .from(registrationTable)
        .where(eq(registrationTable.email, row.email));
      const duplicateRegistrations: AdminDuplicateRegistration[] = [];
      for (const other of sameEmail) {
        if (other.id === row.id) continue;
        const campaign = await campaigns.getById(other.campaignId);
        duplicateRegistrations.push({
          id: other.id,
          campaignId: other.campaignId,
          campaignLabel: campaign?.label ?? other.campaignId,
          status: other.status as RegistrationStatus,
          createdAt: other.createdAt.toISOString(),
        });
      }

      return {
        registration: toView(row as RegistrationRow),
        existingUserId: account?.id ?? null,
        priorMemberships,
        classification: priorMemberships.length > 0 ? "returning" : "new",
        duplicateRegistrations,
      };
    },
  };
}
