import type { Stat } from "@/components/dashboard/stat-card";
import type { AdminOverviewCounts } from "@/lib/overview";

/**
 * The six counts, split into the two questions the committee actually asks:
 * "is there anything waiting for me?" and "how is the team doing?".
 *
 * Only the first two are emphasised — they are work, and they can be cleared.
 * The membership counts are context; colouring them would spend the one
 * accent the palette has on something nobody can act on.
 */
export function pendingStats(counts: AdminOverviewCounts): Stat[] {
  return [
    {
      label: "pendents de verificar",
      value: counts.pendingVerification,
      hint: "han enviat el formulari i encara no han confirmat el correu",
    },
    {
      label: "pendents de revisar",
      value: counts.pendingReview,
      hint: "correu confirmat, esperen que el comitè decideixi",
      href: "/registrations",
      emphasis: true,
    },
  ];
}

export function membershipStats(counts: AdminOverviewCounts): Stat[] {
  return [
    {
      label: "membres actius",
      value: counts.activeMembers,
      hint: "amb l'alta vigent a la campanya actual",
      href: "/members",
    },
    {
      label: "nous",
      value: counts.newMembers,
      hint: "primera campanya amb nosaltres",
      href: "/members",
    },
    {
      label: "repetidors",
      value: counts.returningMembers,
      hint: "ja havien estat membres abans",
      href: "/members",
    },
    {
      label: "sense renovar",
      value: counts.unrenewedPastMembers,
      hint: "membres d'anys anteriors que encara no s'han donat d'alta",
      href: "/members",
    },
  ];
}
