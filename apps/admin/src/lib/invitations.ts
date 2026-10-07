"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";

import type {
  InvitationSortKey,
  SortDirection,
} from "@repo/constants/validators/admin-list";
import { toast } from "@repo/ui/toast";

import type {
  AdminBulkCreateInvitationsResponse,
  AdminInvitation,
  AdminInvitationList,
  InvitationRole,
  InvitationStatusFilter,
  ListPage,
} from "@/lib/admin-types";
import type { DataTableSelectionValue } from "@/components/data-table/types";
import { apiClient, NO_BODY_POST } from "@/lib/api";
import {
  ApiRequestError,
  errorDetail,
  errorMessage,
  unwrap,
} from "@/lib/api-error";
import { queryKeys } from "@/lib/query-keys";
import { useTableExport, type TableExportQuery } from "@/lib/table-export";

export const INVITATIONS_PAGE_SIZE = 50;

/**
 * Search, filters and ordering: the invitations list's query minus the page.
 */
export interface InvitationsQuery {
  campaignId: string;
  status: InvitationStatusFilter;
  q: string;
  /** Resolved in SQL by the route; never re-ordered on the client. */
  sort: InvitationSortKey;
  dir: SortDirection;
}

/**
 * The one place `InvitationsQuery` becomes API parameters. The list adds the
 * page to it and the export sends it as it is, so the two cannot drift apart.
 */
function invitationsApiQuery(
  params: InvitationsQuery,
): TableExportQuery<"/v1/admin/invitations/export"> {
  return {
    campaignId: params.campaignId,
    ...(params.status === "all" ? {} : { status: params.status }),
    ...(params.q ? { q: params.q } : {}),
    sort: params.sort,
    dir: params.dir,
  };
}

export function useInvitations(params: InvitationsQuery & ListPage) {
  return useQuery({
    queryKey: queryKeys.invitations.list(params),
    enabled: params.campaignId.length > 0,
    placeholderData: (previous) => previous,
    queryFn: async (): Promise<AdminInvitationList> =>
      unwrap(
        await apiClient.GET("/v1/admin/invitations", {
          params: {
            query: {
              ...invitationsApiQuery(params),
              limit: params.limit,
              offset: params.offset,
            },
          },
        }),
      ),
  });
}

export function useInvitationsExport(params: InvitationsQuery) {
  return useTableExport(
    "/v1/admin/invitations/export",
    invitationsApiQuery(params),
  );
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
 * Every 409 the create route can return carries the code `CONFLICT`; only the
 * message separates "that is not a udl.cat address" from "there is already a
 * pending invitation for this email" and "that is not the current campaign".
 * Matching on the flag name the API tells us to resend with is the narrowest
 * signal available — and the form also pre-checks the domain itself, so this
 * branch is the backstop, not the primary path.
 */
function isExternalDomainConflict(detail: string | undefined): boolean {
  return detail?.includes("allowExternalDomain") === true;
}

/**
 * The form only ever sends the current campaign, so this means it changed
 * while the dialog was open. It is not a duplicate, so it surfaces as a
 * failure rather than as the duplicate notice.
 */
function isNotCurrentCampaignConflict(detail: string | undefined): boolean {
  return detail?.includes("current campaign") === true;
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
      if (isNotCurrentCampaignConflict(error.detail)) throw error;
      return isExternalDomainConflict(error.detail)
        ? { kind: "needsExternalConfirm", detail: error.detail ?? "" }
        : {
            kind: "duplicate",
            detail:
              error.detail ??
              "ja hi ha una invitació pendent per aquesta adreça en aquesta campanya.",
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
      toast.success(`invitació enviada a ${outcome.invitation.email}`);
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

export interface MemberSelectionQuery {
  q?: string;
  filter?: "all" | "current" | "past";
  campaignId?: string;
}

export interface BulkCreateInvitationsInput {
  campaignId: string;
  query: MemberSelectionQuery;
  selection: DataTableSelectionValue;
}

export function useBulkCreateInvitations(): UseMutationResult<
  AdminBulkCreateInvitationsResponse,
  Error,
  BulkCreateInvitationsInput
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ campaignId, query, selection }) =>
      unwrap(
        await apiClient.POST("/v1/admin/invitations/bulk", {
          body: {
            campaignId,
            selection:
              selection.mode === "ids"
                ? {
                    mode: "ids",
                    userIds: [...selection.rowIds],
                  }
                : {
                    mode: "all",
                    ...query,
                    excludedUserIds: [...selection.excludedRowIds],
                  },
          },
        }),
      ),
    onSuccess: (result) => {
      const skipped =
        result.skipped.member +
        result.skipped.registered +
        result.skipped.invited;
      toast.success(
        result.created === 1
          ? "1 invitació enviada"
          : `${result.created} invitacions enviades`,
        skipped > 0
          ? {
              description: `${skipped} ${skipped === 1 ? "persona ha quedat fora" : "persones han quedat fora"} perquè ja tenien una alta, una inscripció o una invitació.`,
            }
          : undefined,
      );
      void queryClient.invalidateQueries({
        queryKey: queryKeys.invitations.all,
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.members.all });
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
  { kind: "resend"; id: string } | { kind: "cancel"; id: string };

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
        action.kind === "resend"
          ? "invitació reenviada"
          : "invitació anul·lada",
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
