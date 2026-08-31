import { requirePageCapability } from "@/lib/permissions";

export default async function MembersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePageCapability("members.read");
  return children;
}
