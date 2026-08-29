"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/select";
import { Label } from "@repo/ui/label";

/** The minimum a screen needs to offer a campaign choice. */
export interface CampaignOption {
  id: string;
  label: string;
  isCurrent?: boolean;
}

/**
 * The campaign selector shared by the review queue and the invitations page.
 *
 * Both `GET /v1/admin/registrations` and `GET /v1/admin/invitations` take
 * `campaignId` as a *required* parameter — there is no cross-campaign listing
 * — so this is not a filter that can be cleared. It defaults to the current
 * campaign and always has a value.
 */
export function CampaignPicker({
  id,
  label = "campanya",
  campaigns,
  value,
  onChange,
}: {
  id: string;
  label?: string;
  campaigns: readonly CampaignOption[];
  value: string;
  onChange: (campaignId: string) => void;
}) {
  // One campaign is not a choice; a select that can only be set to what it
  // already says is noise.
  if (campaigns.length <= 1) return null;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="h-11 w-full sm:h-9 sm:w-64">
          <SelectValue placeholder="tria una campanya" />
        </SelectTrigger>
        <SelectContent>
          {campaigns.map((campaign) => (
            <SelectItem key={campaign.id} value={campaign.id}>
              {campaign.label}
              {campaign.isCurrent === true ? " · actual" : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
