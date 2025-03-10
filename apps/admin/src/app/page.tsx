import { api, HydrateClient } from "@repo/trpc/server";

export default async function Home() {
  const hello = await api.user.hello({ text: "from tRPC" });

  return (
    <HydrateClient>
      <p className="text-4xl font-semibold text-primary">{hello ? hello.greeting : "Loading tRPC query..."}</p>
    </HydrateClient>
  );
}
