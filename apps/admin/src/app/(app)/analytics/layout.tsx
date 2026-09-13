import { requirePageCapability } from "@/lib/permissions.server";

export default async function AnalyticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePageCapability("analytics.read");
  return children;
}
