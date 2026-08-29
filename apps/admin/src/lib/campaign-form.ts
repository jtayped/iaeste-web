import type { AdminCampaign } from "@/lib/admin-types";
import { fromIsoDay, toIsoDay } from "@/lib/format";
import type { CampaignDates } from "@/lib/campaigns";

/**
 * The campaign form's state and its rules.
 *
 * Kept out of the components because the create sheet and the edit panel are
 * the same six fields with different submit semantics, and a second copy of
 * the slug pattern is exactly the kind of duplication the root `AGENTS.md`
 * warns about. The API re-validates all of it either way — this is what stops
 * an obviously wrong request from being sent, not the boundary.
 */
export interface CampaignFormState {
  slug: string;
  label: string;
  membershipStartsAt: Date | undefined;
  membershipEndsAt: Date | undefined;
  registrationOpensAt: Date | undefined;
  registrationClosesAt: Date | undefined;
}

export type CampaignFormErrors = Partial<
  Record<keyof CampaignFormState, string>
>;

/** Mirrors `^[a-z0-9-]+$` from `adminCreateCampaignBodySchema`. */
const SLUG_PATTERN = /^[a-z0-9-]+$/;

export const EMPTY_CAMPAIGN_FORM: CampaignFormState = {
  slug: "",
  label: "",
  membershipStartsAt: undefined,
  membershipEndsAt: undefined,
  registrationOpensAt: undefined,
  registrationClosesAt: undefined,
};

export function campaignFormFrom(campaign: AdminCampaign): CampaignFormState {
  return {
    slug: campaign.slug,
    label: campaign.label,
    membershipStartsAt: fromIsoDay(campaign.membershipStartsAt),
    membershipEndsAt: fromIsoDay(campaign.membershipEndsAt),
    registrationOpensAt: fromIsoDay(campaign.registrationOpensAt),
    registrationClosesAt: fromIsoDay(campaign.registrationClosesAt),
  };
}

export function validateCampaignForm(
  state: CampaignFormState,
): CampaignFormErrors {
  const errors: CampaignFormErrors = {};

  const slug = state.slug.trim();
  if (slug.length === 0) errors.slug = "l'identificador és obligatori";
  else if (slug.length > 64)
    errors.slug = "l'identificador no pot superar els 64 caràcters";
  else if (!SLUG_PATTERN.test(slug))
    errors.slug = "només minúscules, xifres i guions";

  const label = state.label.trim();
  if (label.length === 0) errors.label = "el nom és obligatori";
  else if (label.length > 120)
    errors.label = "el nom no pot superar els 120 caràcters";

  if (!state.membershipStartsAt) errors.membershipStartsAt = "data obligatòria";
  if (!state.membershipEndsAt) errors.membershipEndsAt = "data obligatòria";
  if (!state.registrationOpensAt)
    errors.registrationOpensAt = "data obligatòria";
  if (!state.registrationClosesAt)
    errors.registrationClosesAt = "data obligatòria";

  if (
    state.membershipStartsAt &&
    state.membershipEndsAt &&
    state.membershipEndsAt <= state.membershipStartsAt
  ) {
    errors.membershipEndsAt = "ha de ser posterior a l'inici";
  }

  if (
    state.registrationOpensAt &&
    state.registrationClosesAt &&
    state.registrationClosesAt <= state.registrationOpensAt
  ) {
    errors.registrationClosesAt = "ha de ser posterior a l'obertura";
  }

  return errors;
}

/** The four dates as ISO instants, once the form is known to be complete. */
export function campaignDates(
  state: CampaignFormState,
): CampaignDates | undefined {
  const {
    membershipStartsAt,
    membershipEndsAt,
    registrationOpensAt,
    registrationClosesAt,
  } = state;

  if (
    !membershipStartsAt ||
    !membershipEndsAt ||
    !registrationOpensAt ||
    !registrationClosesAt
  ) {
    return undefined;
  }

  return {
    membershipStartsAt: toIsoDay(membershipStartsAt),
    membershipEndsAt: toIsoDay(membershipEndsAt),
    registrationOpensAt: toIsoDay(registrationOpensAt),
    registrationClosesAt: toIsoDay(registrationClosesAt),
  };
}

export function hasErrors(errors: CampaignFormErrors): boolean {
  return Object.keys(errors).length > 0;
}
