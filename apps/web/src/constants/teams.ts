import { type Team } from "@/types/teams";
import { Building2, CalendarDays, Camera, Computer, Users } from "lucide-react";

const teams: Team[] = [
  {
    key: "junta",
    icon: Users,
  },
  {
    key: "empreses",
    icon: Building2,
  },
  {
    key: "marketing",
    icon: Camera,
  },
  {
    key: "it",
    icon: Computer,
  },
  {
    key: "eventos",
    icon: CalendarDays,
  },
];

export default teams;
