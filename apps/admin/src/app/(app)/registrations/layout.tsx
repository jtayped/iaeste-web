import { requirePageCapability } from "@/lib/permissions";

export default async function RegistrationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePageCapability("registrations.review");
  return children;
}
