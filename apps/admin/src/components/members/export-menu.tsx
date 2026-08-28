"use client";

import { Download } from "lucide-react";

import { Button } from "@repo/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/dropdown-menu";

import type { AdminCampaignWithCounts } from "@/lib/admin-types";

/**
 * "exporta CSV", for the shell's `actions` slot.
 *
 * `GET /api/v1/admin/members/export` answers with `text/csv` and a
 * `Content-Disposition: attachment`, so the only thing needed to save the file
 * is a normal same-origin link — the session cookie rides along and the
 * browser does the download. That is why these are `<a>` elements and not
 * `fetch` calls: no blob, no object URL to revoke, and the download survives
 * navigating away.
 *
 * It is deliberately not in the generated client. The route returns CSV, and
 * `openapi-fetch` would try to parse that as JSON.
 */
export function MembersExportMenu({
  campaigns,
  hasCurrent,
}: {
  campaigns: readonly AdminCampaignWithCounts[];
  hasCurrent: boolean;
}) {
  // Without a campaign there is nothing to export: the route answers 409 when
  // no campaign is current and 404 for an id that does not exist, and a menu
  // whose every item downloads an error page is worse than no menu.
  if (campaigns.length === 0 && !hasCurrent) return null;

  const others = campaigns.filter((campaign) => !campaign.isCurrent);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="w-full sm:w-auto">
          <Download className="size-4" aria-hidden />
          exporta csv
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>membres d&apos;una campanya</DropdownMenuLabel>
        {hasCurrent ? (
          <DropdownMenuItem asChild>
            <a href="/api/v1/admin/members/export" download>
              campanya actual
            </a>
          </DropdownMenuItem>
        ) : null}
        {others.length > 0 ? (
          <>
            {hasCurrent ? <DropdownMenuSeparator /> : null}
            {others.map((campaign) => (
              <DropdownMenuItem key={campaign.id} asChild>
                <a
                  href={`/api/v1/admin/members/export?campaignId=${encodeURIComponent(campaign.id)}`}
                  download
                >
                  {campaign.label}
                </a>
              </DropdownMenuItem>
            ))}
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
