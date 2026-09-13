import Link from "next/link";

import { buttonVariants } from "@repo/ui/button";
import { Card } from "@repo/ui/card";
import { cn } from "@repo/ui/lib/utils";

/** First name only: the greeting is warmer than the full legal string. */
function firstName(name: string | null): string | null {
  return name?.trim().split(/\s+/)[0] ?? null;
}

/**
 * The first thing a newly accepted member sees after following the magic link
 * in their acceptance email.
 *
 * Without it the dashboard opens on four counters and a sidebar with one entry,
 * which reads as a product that failed to load rather than as the deliberately
 * small surface it is. So it says three things: you are in, this is all there
 * is here for now, and the committee will reach you by email — which is the
 * promise the acceptance email and the "en revisió" page both make.
 *
 * The profile link is the point of the card. The acceptance email tells people
 * to check their data, and `/profile` is otherwise reachable only from the
 * avatar menu, which nobody opens on their first visit.
 */
export function MemberWelcome({ name }: { name: string | null }) {
  const first = firstName(name);

  return (
    <Card className="rounded-lg border-border p-5 shadow-none md:p-6">
      <h2 className="text-base font-semibold tracking-tight">
        ja ets dins{first ? `, ${first}` : ""}
      </h2>
      <p className="mt-2 max-w-[62ch] text-sm text-muted-foreground">
        aquest és l&apos;espai intern del comitè. de moment hi veuràs com anem
        d&apos;equip i quina campanya tenim en marxa; hi anirem afegint eines a
        mesura que les necessitem. la resta t&apos;arribarà per correu, com
        sempre.
      </p>
      <p className="mt-3 max-w-[62ch] text-sm text-muted-foreground">
        mentrestant, comprova que les teves dades siguin correctes: són les que
        farem servir per escriure&apos;t.
      </p>
      <Link
        href="/profile"
        className={cn(buttonVariants({ size: "sm" }), "mt-5")}
      >
        revisa el meu perfil
      </Link>
    </Card>
  );
}
