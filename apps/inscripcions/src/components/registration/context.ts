import { isFormField, type ProfileForm } from "@/lib/form-schema";
import type { Invitation } from "@/lib/invitation-flow";
import type { FieldIssue, Session } from "@/lib/registration-flow";

import type { DetailsContext } from "./details-step";

export interface MappedFieldIssue {
  field: keyof ProfileForm;
  message: string;
}

/** The body shape both submit endpoints share, from one filled-in form. */
export function toRequestProfile(values: ProfileForm) {
  return {
    name: values.name,
    surnames: values.surnames,
    phone: values.phone,
    degree: values.degree,
    year: values.year,
    ...(values.note ? { note: values.note } : {}),
  };
}

export function toMappedIssues(issues: FieldIssue[]): MappedFieldIssue[] {
  return issues.flatMap((issue) =>
    isFormField(issue.field)
      ? [{ field: issue.field, message: issue.message }]
      : [],
  );
}

/**
 * A draft carries whichever addresses were supplied at the start — one of the
 * two, or both — so the summary line joins what is actually there rather than
 * assuming a pair.
 */
export function toSessionContext(session: Session): DetailsContext {
  const addresses = (["university", "personal"] as const).flatMap((kind) => {
    const entry = session.emails[kind];
    return entry ? [entry.maskedAddress] : [];
  });

  return {
    email: addresses.join(" · "),
    profile: session.profile,
    memberships: session.memberships,
    invited: false,
    openCampaignRegistrationStatus: session.openCampaignRegistrationStatus,
  };
}

/**
 * An invitation can prefill from two places: the name whoever invited them
 * typed, and a profile we already hold if they have been a member before.
 * The stored profile wins on the fields it has, because it is the person's
 * own last word rather than someone else's guess at their name.
 */
export function toInvitationContext(invitation: Invitation): DetailsContext {
  const profile = invitation.profile
    ? invitation.profile
    : invitation.prefillName || invitation.prefillSurnames
      ? {
          name: invitation.prefillName ?? "",
          surnames: invitation.prefillSurnames ?? "",
          phone: "",
          degree: "",
          year: 1,
        }
      : null;

  return {
    email: invitation.email,
    profile,
    memberships: invitation.memberships,
    invited: true,
    campaignLabel: invitation.campaignLabel,
  };
}

/**
 * What to say when the API rejected the body but named no field this form
 * can highlight — a schema change on the server, or a complaint about the
 * request as a whole rather than one input.
 */
export function unmappedMessage(issues: FieldIssue[]) {
  const unmapped = issues.filter((issue) => !isFormField(issue.field));
  if (unmapped.length > 0) return unmapped.map((i) => i.message).join(" ");
  return issues.length === 0
    ? "les dades no són vàlides. revisa el formulari i torna-ho a provar."
    : "revisa les dades marcades i torna-ho a provar.";
}
