"use client";

import * as React from "react";

import { Button } from "@repo/ui/button";

import { CampaignFields } from "@/components/campaigns/campaign-fields";
import { Section } from "@/components/admin/detail-panel";
import type { AdminCampaignWithCounts } from "@/lib/admin-types";
import { useCampaignAction } from "@/lib/campaigns";
import {
  campaignDates,
  campaignFormFrom,
  hasErrors,
  validateCampaignForm,
  type CampaignFormErrors,
  type CampaignFormState,
} from "@/lib/campaign-form";

/**
 * The editable half of the campaign fitxa.
 *
 * It PATCHes the whole form rather than diffing it: the update schema takes
 * every field as optional, so sending all six is both valid and simpler than
 * working out which ones moved. The exception is `slug`, which is only
 * included while the campaign is a draft — the API rejects a slug change on a
 * published campaign, and sending the unchanged value would turn a no-op save
 * into a 409.
 */
export function EditCampaign({
  campaign,
}: {
  campaign: AdminCampaignWithCounts;
}) {
  const action = useCampaignAction();
  const slugEditable = campaign.state === "draft";

  const [state, setState] = React.useState<CampaignFormState>(() =>
    campaignFormFrom(campaign),
  );
  const [errors, setErrors] = React.useState<CampaignFormErrors>({});

  // A mutation elsewhere on the page (archive, make current) refetches the
  // campaign; the form should follow the record rather than keep showing what
  // it was loaded with.
  const loadedAt = campaign.updatedAt;
  React.useEffect(() => {
    setState(campaignFormFrom(campaign));
    setErrors({});
    // Re-seeding on every `campaign` identity change would fight typing; the
    // record's own `updatedAt` is what marks a genuinely new version.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedAt]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const found = validateCampaignForm(state);
    setErrors(found);
    if (hasErrors(found)) return;

    const dates = campaignDates(state);
    if (!dates) return;

    action.mutate({
      kind: "update",
      id: campaign.id,
      patch: {
        label: state.label.trim(),
        ...(slugEditable ? { slug: state.slug.trim() } : {}),
        ...dates,
      },
    });
  }

  if (campaign.state === "archived") return null;

  return (
    <Section title="dades">
      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        <CampaignFields
          state={state}
          errors={errors}
          slugEditable={slugEditable}
          onChange={(patch) =>
            setState((current) => ({ ...current, ...patch }))
          }
        />
        <div className="flex [&>*]:min-h-11 [&>*]:w-full sm:[&>*]:min-h-9 sm:[&>*]:w-auto">
          <Button type="submit" disabled={action.isPending}>
            {action.isPending ? "desant…" : "desa els canvis"}
          </Button>
        </div>
      </form>
    </Section>
  );
}
