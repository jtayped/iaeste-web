import { Team } from "@/types/teams";
import { Building2, CalendarDays, Camera, Computer, Users } from "lucide-react";

const teams: Team[] = [
  {
    title: "Junta",
    description: "Lorem ipsum dolor sit amet",
    icon: Users,
  },
  {
    title: "Empreses",
    description: "Lorem ipsum dolor sit amet",
    icon: Building2,
  },
  {
    title: "Marketing",
    description: "Lorem ipsum dolor sit amet",
    icon: Camera,
  },
  {
    title: "IT",
    description: "Lorem ipsum dolor sit amet",
    icon: Computer,
  },
  {
    title: "Eventos",
    description: "Lorem ipsum dolor sit amet",
    icon: CalendarDays,
  },
];

export default teams;
