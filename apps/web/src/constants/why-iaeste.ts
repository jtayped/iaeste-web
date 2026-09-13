import { type Reason } from "@/types/why-iaeste";
import { Briefcase, Earth, TrendingUp, Users } from "lucide-react";

const reasons: Reason[] = [
  { key: "internship", icon: Briefcase },
  /* Was `User` — a single silhouette for "professional growth". */
  { key: "growth", icon: TrendingUp },
  { key: "oportunities", icon: Earth },
  /* Was `PersonStanding`, the accessibility glyph, for "cultural exchange". */
  { key: "exchange", icon: Users },
];

export default reasons;
