import HomePage from "@/components/home";

const INSCRIPCIONS_STATE = process.env.INSCRIPCIONS_STATE as "on" | "off";

export default async function Home() {
  return <HomePage state={INSCRIPCIONS_STATE} />;
}
