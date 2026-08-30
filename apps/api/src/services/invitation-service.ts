import crypto from "node:crypto";

import { getDb } from "@repo/db/client";
import {
  createCampaignRepository,
  createInvitationRepository,
  createKnownPersonRepository,
  IllegalTransitionError,
  NotFoundError,
  type InvitationRole,
  type KnownPerson,
  type RegistrationProfileSnapshot,
} from "@repo/db/repositories";
import MembershipAccepted from "@repo/email/acceptance";
import UserInvitation from "@repo/email/invitation";
import InvitationCancelled from "@repo/email/invitation-cancelled";
import { createResendEmailer, type Emailer } from "@repo/email/resend";

import {
  getAdminPublicOrigin,
  getEmailConfig,
  getInscripcionsPublicOrigin,
} from "../config";
import "../lib/react-global";

/**
 * IA-32. A named constant next to the magic link's ten minutes, per the
 * plan's open question 2.
 */
export const INVITATION_EXPIRES_IN_MS = 7 * 24 * 60 * 60 * 1000;

function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

let cachedEmailer: Emailer | undefined;
function defaultEmailer(): Emailer {
  cachedEmailer ??= createResendEmailer(getEmailConfig());
  return cachedEmailer;
}

export interface AdminInvitationView {
  id: string;
  campaignId: string;
  email: string;
  intendedRole: InvitationRole;
  prefillName: string | null;
  prefillSurnames: string | null;
  status: "pending" | "accepted" | "cancelled";
  expired: boolean;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
}

export interface InvitationLookupResult extends KnownPerson {
  email: string;
  prefillName: string | null;
  prefillSurnames: string | null;
  campaignId: string;
  campaignLabel: string;
}

export interface CreateInvitationServiceInput {
  campaignId: string;
  email: string;
  inviterId: string;
  intendedRole: InvitationRole;
  prefillName?: string | null;
  prefillSurnames?: string | null;
}

export interface AdminInvitationListParams {
  campaignId: string;
  q?: string;
  status?: "pending" | "accepted" | "cancelled" | "expired";
  limit: number;
  offset: number;
}

export interface AdminInvitationListPage {
  rows: AdminInvitationView[];
  total: number;
  limit: number;
  offset: number;
}

export interface InvitationService {
  /** Unpaged, newest-first — used by the create flow's duplicate check. */
  listByCampaign(campaignId: string): Promise<AdminInvitationView[]>;
  /** The admin table: server-side `q`/`status` filter and `limit`/`offset`. */
  listPage(params: AdminInvitationListParams): Promise<AdminInvitationListPage>;
  create(input: CreateInvitationServiceInput): Promise<AdminInvitationView>;
  resend(invitationId: string): Promise<void>;
  cancel(invitationId: string): Promise<void>;
  lookup(rawToken: string): Promise<InvitationLookupResult | undefined>;
  accept(
    rawToken: string,
    profile: RegistrationProfileSnapshot,
  ): Promise<{ alreadyMember: boolean }>;
}

export interface InvitationServiceDependencies {
  emailer?: Emailer;
  db?: import("@repo/db/client").Database;
}

function toView(
  row: Awaited<
    ReturnType<ReturnType<typeof createInvitationRepository>["listByCampaign"]>
  >[number],
): AdminInvitationView {
  return {
    id: row.id,
    campaignId: row.campaignId,
    email: row.email,
    intendedRole: row.intendedRole,
    prefillName: row.prefillName,
    prefillSurnames: row.prefillSurnames,
    status: row.status,
    expired: row.expired,
    expiresAt: row.expiresAt.toISOString(),
    acceptedAt: row.acceptedAt ? row.acceptedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}

export function createInvitationService(
  dependencies: InvitationServiceDependencies = {},
): InvitationService {
  const emailer = () => dependencies.emailer ?? defaultEmailer();
  const resolveDb = () => dependencies.db ?? getDb();

  function invitationLink(rawToken: string): string {
    return `${getInscripcionsPublicOrigin()}/convit#token=${rawToken}`;
  }

  return {
    async listByCampaign(campaignId) {
      const rows =
        await createInvitationRepository(resolveDb()).listByCampaign(
          campaignId,
        );
      return rows.map(toView);
    },

    async listPage(params) {
      const { rows, total } =
        await createInvitationRepository(resolveDb()).listPageForCampaign(
          params,
        );
      return {
        rows: rows.map(toView),
        total,
        limit: params.limit,
        offset: params.offset,
      };
    },

    async create(input) {
      const db = resolveDb();
      const rawToken = crypto.randomBytes(32).toString("hex");
      const created = await createInvitationRepository(db).create({
        campaignId: input.campaignId,
        email: input.email,
        inviterId: input.inviterId,
        intendedRole: input.intendedRole,
        prefillName: input.prefillName ?? null,
        prefillSurnames: input.prefillSurnames ?? null,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + INVITATION_EXPIRES_IN_MS),
      });

      try {
        await emailer().send({
          to: created.email,
          subject: "t'hem convidat a iaeste lc lleida",
          react: UserInvitation({
            email: created.email,
            invitationLink: invitationLink(rawToken),
          }),
        });
      } catch (error) {
        console.error("Failed to send invitation email", error);
      }

      const [listed] = await createInvitationRepository(db).listByCampaign(
        input.campaignId,
      );
      // `listByCampaign` is newest-first, so the row we just inserted is first.
      return toView(listed ?? { ...created, expired: false });
    },

    async resend(invitationId) {
      const db = resolveDb();
      const invitations = createInvitationRepository(db);
      const rawToken = crypto.randomBytes(32).toString("hex");
      const rotated = await invitations.rotateToken(invitationId, {
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + INVITATION_EXPIRES_IN_MS),
      });
      try {
        await emailer().send({
          to: rotated.email,
          subject: "la teva invitació a iaeste lc lleida",
          react: UserInvitation({
            email: rotated.email,
            invitationLink: invitationLink(rawToken),
          }),
        });
      } catch (error) {
        console.error("Failed to resend invitation email", error);
      }
    },

    async cancel(invitationId) {
      const cancelled =
        await createInvitationRepository(resolveDb()).cancel(invitationId);
      try {
        await emailer().send({
          to: cancelled.email,
          subject: "la invitació a iaeste lc lleida ja no és vàlida",
          react: InvitationCancelled({
            email: cancelled.email,
            reason: "cancelled",
          }),
        });
      } catch (error) {
        console.error("Failed to send invitation-cancelled email", error);
      }
    },

    async lookup(rawToken) {
      const db = resolveDb();
      const invitation = await createInvitationRepository(db).getByTokenHash(
        hashToken(rawToken),
      );
      if (
        !invitation ||
        invitation.status !== "pending" ||
        invitation.expiresAt.getTime() <= Date.now()
      ) {
        return undefined;
      }
      const campaign = await createCampaignRepository(db).getById(
        invitation.campaignId,
      );
      // Safe to include here for the same reason the public form only gets
      // it after a correct code: holding this token is proof of control
      // over the address it was mailed to. A returning member should not
      // have to retype what we already hold on them.
      const known = await createKnownPersonRepository(db).lookup(
        invitation.email,
      );
      return {
        email: invitation.email,
        prefillName: invitation.prefillName,
        prefillSurnames: invitation.prefillSurnames,
        campaignId: invitation.campaignId,
        campaignLabel: campaign?.label ?? invitation.campaignId,
        ...known,
      };
    },

    async accept(rawToken, profile) {
      const db = resolveDb();
      const invitations = createInvitationRepository(db);
      const invitation = await invitations.getByTokenHash(hashToken(rawToken));
      if (!invitation) {
        throw new IllegalTransitionError("Invitation token is invalid");
      }

      const result = await invitations.accept(invitation.id, { profile });

      const campaign = await createCampaignRepository(db).getById(
        result.invitation.campaignId,
      );
      try {
        await emailer().send({
          to: result.invitation.email,
          subject: "ja ets membre · iaeste lc lleida",
          react: MembershipAccepted({
            name: `${profile.name}`.trim() || result.invitation.email,
            // First login happens on the admin sign-in page (magic link).
            loginLink: `${getAdminPublicOrigin()}/sign-in`,
            campaign: campaign?.label ?? result.invitation.campaignId,
            via: "invitation",
          }),
        });
      } catch (error) {
        console.error("Failed to send invitation acceptance email", error);
      }

      return { alreadyMember: result.alreadyMember };
    },
  };
}

export { IllegalTransitionError, NotFoundError };
