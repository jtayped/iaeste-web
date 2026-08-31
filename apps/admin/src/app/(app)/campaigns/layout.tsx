import { requirePageCapability } from "@/lib/permissions";

export default async function CampaignsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePageCapability("campaigns.write");
  return children;
}
