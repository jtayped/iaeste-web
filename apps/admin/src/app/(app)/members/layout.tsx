import { requirePageCapability } from "@/lib/permissions.server";

export default async function MembersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePageCapability("members.read");
  return children;
}
