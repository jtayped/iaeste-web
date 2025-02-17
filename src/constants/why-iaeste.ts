import { type Reason } from "@/types/why-iaeste";
import { Briefcase, Earth, PersonStanding, User } from "lucide-react";

const reasons: Reason[] = [
  { key: "oportunities", icon: Earth },
  { key: "growth", icon: User },
  { key: "exchange", icon: PersonStanding },
  { key: "internship", icon: Briefcase },
];

export default reasons;
