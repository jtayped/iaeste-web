import {
  ChartSpline,
  LifeBuoy,
  Lightbulb,
  type LucideIcon,
  UserPlus,
} from "lucide-react";

export type CompanyReason = { key: string; icon: LucideIcon };

/**
 * The order the company page argues in. `support` was translated in `ca` and
 * `es`, missing from `en`, and rendered nowhere — even though "iaeste handles
 * the visa and the housing" is the objection a company actually needs answered.
 */
export const companyReasons: CompanyReason[] = [
  { key: "talent", icon: UserPlus },
  { key: "innovation", icon: Lightbulb },
  { key: "growth", icon: ChartSpline },
  { key: "support", icon: LifeBuoy },
];
