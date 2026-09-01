import { requirePageCapability } from "@/lib/permissions.server";

export default async function InvitationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePageCapability("invitations.write");
  return children;
}
