import { requirePageCapability } from "@/lib/permissions.server";

export default async function AnalyticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePageCapability("dashboard.read");
  return children;
}
