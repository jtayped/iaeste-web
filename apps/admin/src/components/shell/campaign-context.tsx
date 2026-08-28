import { cn } from "@repo/ui/lib/utils";

import type { AdminOverview } from "@/lib/overview";

/**
 * Which campaign is current, and which is open for registration.
 *
 * These two diverge every spring — the committee is running 2026-2027 while
 * 2027-2028 collects applications — and almost every destructive admin action
 * means something different depending on which one is in play. So the header
 * states both rather than making anyone infer it from the page they are on.
 * When one campaign is both, it is shown once with both roles named; showing
 * the same label twice would read as two campaigns.
 */
function Chip({
  tone,
  role,
  label,
}: {
  tone: "current" | "registration";
  role: string;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span
        aria-hidden
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          tone === "current" ? "bg-primary" : "bg-secondary",
        )}
      />
      <span className="font-medium text-foreground">{label}</span>
      <span className="text-muted-foreground">{role}</span>
    </span>
  );
}

export function CampaignContext({ overview }: { overview: AdminOverview }) {
  const { currentCampaign, registrationOpenCampaign } = overview;
  const isSame =
    currentCampaign !== null &&
    registrationOpenCampaign !== null &&
    currentCampaign.id === registrationOpenCampaign.id;

  if (currentCampaign === null && registrationOpenCampaign === null) {
    return (
      <span className="whitespace-nowrap text-xs text-muted-foreground">
        cap campanya activa
      </span>
    );
  }

  return (
    <div className="flex items-center gap-x-4 gap-y-1 text-xs">
      {isSame && currentCampaign ? (
        <Chip
          tone="current"
          label={currentCampaign.label}
          role="actual · inscripcions obertes"
        />
      ) : (
        <>
          {currentCampaign ? (
            <Chip tone="current" label={currentCampaign.label} role="actual" />
          ) : (
            <span className="whitespace-nowrap text-muted-foreground">
              cap campanya actual
            </span>
          )}
          {registrationOpenCampaign ? (
            <Chip
              tone="registration"
              label={registrationOpenCampaign.label}
              role="inscripcions obertes"
            />
          ) : (
            <span className="whitespace-nowrap text-muted-foreground">
              inscripcions tancades
            </span>
          )}
        </>
      )}
    </div>
  );
}
