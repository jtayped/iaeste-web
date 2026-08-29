"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";

import { toast } from "@repo/ui/sonner";

import type {
  AdminInvitation,
  AdminInvitationList,
  InvitationRole,
  InvitationStatusFilter,
} from "@/lib/admin-types";
import { apiClient, NO_BODY_POST } from "@/lib/api";
import {
  ApiRequestError,
  errorDetail,
  errorMessage,
  unwrap,
} from "@/lib/api-error";
import { queryKeys } from "@/lib/query-keys";

export const INVITATIONS_PAGE_SIZE = 50;

export interface InvitationsQuery {
  campaignId: string;
  status: InvitationStatusFilter;
  q: string;
  limit: number;
  offset: number;
}

export function useInvitations(params: InvitationsQuery) {
  return useQuery({
    queryKey: queryKeys.invitations.list(params),
    enabled: params.campaignId.length > 0,
    placeholderData: (previous) => previous,
    queryFn: async (): Promise<AdminInvitationList> =>
      unwrap(
        await apiClient.GET("/v1/admin/invitations", {
          params: {
            query: {
              campaignId: params.campaignId,
              ...(params.status === "all" ? {} : { status: params.status }),
              ...(params.q ? { q: params.q } : {}),
              limit: params.limit,
              offset: params.offset,
            },
          },
        }),
      ),
  });
}

export interface CreateInvitationInput {
  campaignId: string;
  email: string;
  intendedRole: InvitationRole;
  prefillName?: string;
  prefillSurnames?: string;
  allowExternalDomain?: boolean;
}

/**
 * Why this mutation resolves instead of throwing for the interesting cases:
 * three of the four failures are things the *form* has to render inline (a
 * confirmation step, a duplicate warning, a missing capability), not things a
 * red toast can express. Only a genuine failure is left to the error path.
 */
export type InviteOutcome =
  | { kind: "created"; invitation: AdminInvitation }
  | { kind: "needsExternalConfirm"; detail: string }
  | { kind: "duplicate"; detail: string }
  | { kind: "forbiddenAdmin"; detail: string };

/** `udl.cat` and its subdomains are the addresses the API accepts unprompted. */
export function isUdlEmail(email: string): boolean {
  const domain = email.trim().toLowerCase().split("@").at(-1) ?? "";
  return domain === "udl.cat" || domain.endsWith(".udl.cat");
}

/**
 * Both 409s the create route can return carry the code `CONFLICT`; only the
 * message separates "that is not a udl.cat address" from "there is already a
 * pending invitation for this email". Matching on the flag name the API tells
 * us to resend with is the narrowest signal available — and the form also
 * pre-checks the domain itself, so this branch is the backstop, not the
 * primary path.
 */
function isExternalDomainConflict(detail: string | undefined): boolean {
  return detail?.includes("allowExternalDomain") === true;
}

async function createInvitation(
  input: CreateInvitationInput,
): Promise<InviteOutcome> {
  try {
    const invitation = unwrap(
      await apiClient.POST("/v1/admin/invitations", {
        body: {
          campaignId: input.campaignId,
          email: input.email,
          intendedRole: input.intendedRole,
          ...(input.prefillName ? { prefillName: input.prefillName } : {}),
          ...(input.prefillSurnames
            ? { prefillSurnames: input.prefillSurnames }
            : {}),
          ...(input.allowExternalDomain ? { allowExternalDomain: true } : {}),
        },
      }),
    );
    return { kind: "created", invitation };
  } catch (error) {
    if (!(error instanceof ApiRequestError)) throw error;

    if (error.status === 403) {
      return {
        kind: "forbiddenAdmin",
        detail:
          error.detail ??
          "el teu compte no pot convidar ningú com a administrador.",
      };
    }

    if (error.status === 409) {
      return isExternalDomainConflict(error.detail)
        ? { kind: "needsExternalConfirm", detail: error.detail ?? "" }
        : {
            kind: "duplicate",
            detail:
              error.detail ??
              "ja hi ha un convit pendent per aquesta adreça en aquesta campanya.",
          };
    }

    throw error;
  }
}

export function useCreateInvitation(): UseMutationResult<
  InviteOutcome,
  Error,
  CreateInvitationInput
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createInvitation,
    onSuccess: (outcome) => {
      if (outcome.kind !== "created") return;
      toast.success(`convit enviat a ${outcome.invitation.email}`);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.invitations.all,
      });
    },
    onError: (error) => {
      const detail = errorDetail(error);
      toast.error(errorMessage(error), {
        ...(detail ? { description: detail } : {}),
      });
    },
  });
}

export type InvitationAction =
  | { kind: "resend"; id: string }
  | { kind: "cancel"; id: string };

export function useInvitationAction(): UseMutationResult<
  void,
  Error,
  InvitationAction
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (action: InvitationAction) => {
      const params = { path: { id: action.id } };
      if (action.kind === "resend") {
        unwrap(
          await apiClient.POST("/v1/admin/invitations/{id}/resend", {
            params,
            ...NO_BODY_POST,
          }),
        );
        return;
      }
      unwrap(
        await apiClient.POST("/v1/admin/invitations/{id}/cancel", {
          params,
          ...NO_BODY_POST,
        }),
      );
    },
    onSuccess: (_data, action) => {
      toast.success(
        action.kind === "resend" ? "convit reenviat" : "convit anul·lat",
      );
      void queryClient.invalidateQueries({
        queryKey: queryKeys.invitations.all,
      });
    },
    onError: (error) => {
      const detail = errorDetail(error);
      toast.error(errorMessage(error), {
        ...(detail ? { description: detail } : {}),
      });
    },
  });
}
