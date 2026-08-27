import HomePage from "@/components/home";
import { getRegistrationAvailability } from "@/lib/registration-status";

export const dynamic = "force-dynamic";

export default async function Home() {
  const availability = await getRegistrationAvailability();
  return <HomePage availability={availability} />;
}
