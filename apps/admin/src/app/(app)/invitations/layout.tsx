import { requirePageCapability } from "@/lib/permissions";

export default async function InvitationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePageCapability("invitations.write");
  return children;
}
