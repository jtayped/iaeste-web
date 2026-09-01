import { requirePageCapability } from "@/lib/permissions.server";

export default async function CampaignsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePageCapability("campaigns.write");
  return children;
}
