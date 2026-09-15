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

  const selected = campaigns.find((campaign) => campaign.id === value);
  const selectedLabel = selected
    ? `${selected.label}${selected.isCurrent === true ? " · actual" : ""}`
    : undefined;

  return (
    // The tooltip is on the field rather than the trigger because the trigger
    // takes no `title` of its own; hovering it still picks this one up.
    <div className="min-w-0 space-y-1.5" title={selectedLabel}>
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <Select
        value={value}
        // The campaign is required, so "no campaign" is not a state this can
        // be put into — an empty value is ignored rather than passed on as a
        // filter nobody can read back.
        onValueChange={(next) => {
          if (next !== "") onChange(next);
        }}
      >
        {/* `curs 2026-2027 · inscripcions obertes` is wider than any fixed
            track, so the trigger keeps a minimum width and grows to a cap,
            and the label ellipsizes inside it instead of spilling out over
            the table header. The full text stays on `title`. */}
        <SelectTrigger
          id={id}
          className="h-11 w-full min-w-0 sm:h-9 sm:w-auto sm:max-w-80 sm:min-w-56"
        >
          <SelectValue className="truncate" placeholder="tria una campanya" />
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
