"use client";

import Link from "next/link";

import { Badge } from "@repo/ui/badge";

import { Field, FieldList, Section } from "@/components/admin/detail-panel";
import { StatusBadge } from "@/components/admin/status-badge";
import { CampaignActions } from "@/components/campaigns/campaign-actions";
import { EditCampaign } from "@/components/campaigns/edit-campaign";
import type { AdminCampaignWithCounts } from "@/lib/admin-types";
import { useCampaigns } from "@/lib/campaigns";
import { formatDateLong } from "@/lib/format";
import { campaignState } from "@/lib/labels";

/**
 * The campaign fitxa.
 *
 * There is no `GET /v1/admin/campaigns/{id}`, so this subscribes to the *list*
 * query and finds its row. That is what makes the page redraw after an action:
 * every campaign mutation invalidates the list, the list refetches, and this
 * picks the fresh row out of it.
 */
export function CampaignDetail({
  id,
  initialData,
}: {
  id: string;
  initialData: AdminCampaignWithCounts[];
}) {
  const query = useCampaigns(initialData);
  const campaign =
    query.data?.find((row) => row.id === id) ??
    initialData.find((row) => row.id === id);

  // Only reachable if the campaign was archived away by someone else mid-view;
  // the server component already 404s an unknown id.
  if (!campaign) {
    return (
      <p className="text-sm text-muted-foreground">
        aquesta campanya ja no hi és. torna a{" "}
        <Link href="/campaigns" className="underline underline-offset-4">
          campanyes
        </Link>
        .
      </p>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={campaignState(campaign.state)} />
        {campaign.isCurrent ? <Badge>actual</Badge> : null}
        {campaign.isRegistrationOpen ? (
          <Badge variant="secondary">inscripcions obertes</Badge>
        ) : null}
      </div>

      <Section title="resum">
        <FieldList>
          <Field label="identificador">
            <span className="font-mono text-xs">{campaign.slug}</span>
          </Field>
          <Field label="membres actius">{campaign.activeMembers}</Field>
          <Field label="sol·licituds per revisar">
            {campaign.pendingReview > 0 ? (
              <Link
                href={`/registrations?campaign=${campaign.id}&status=pending_review`}
                className="font-medium text-secondary underline-offset-4 hover:underline"
              >
                {campaign.pendingReview}
              </Link>
            ) : (
              campaign.pendingReview
            )}
          </Field>
          <Field label="l'equip">
            {formatDateLong(campaign.membershipStartsAt)} –{" "}
            {formatDateLong(campaign.membershipEndsAt)}
          </Field>
          <Field label="inscripcions">
            {formatDateLong(campaign.registrationOpensAt)} –{" "}
            {formatDateLong(campaign.registrationClosesAt)}
          </Field>
        </FieldList>
      </Section>

      <CampaignActions campaign={campaign} />

      <EditCampaign campaign={campaign} />
    </div>
  );
}
