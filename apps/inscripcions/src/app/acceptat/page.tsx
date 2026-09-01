import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { buttonVariants } from "@repo/ui/button";
import { Paragraph } from "@repo/ui/typography";
import { env } from "@repo/env/inscripcions";

import StatusScreen from "@/components/status";

export const metadata: Metadata = {
  title: "benvingut/da a iaeste lc lleida",
  robots: { index: false, follow: false },
};

/**
 * The end of an accepted public registration. Automatic renewals arrive here
 * straight from the form; committee-reviewed applicants may arrive through a
 * link added to the acceptance email later.
 */
const AcceptedPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ via?: string }>;
}) => {
  const renewed = (await searchParams).via === "renewal";

  return (
    <StatusScreen
      icon="user-check"
      tone="positive"
      title={renewed ? "membresia renovada!" : "ja ets dels nostres!"}
      celebrate
      actions={
        <>
          {env.NEXT_PUBLIC_WHATSAPP_INVITE && (
            <Link
              href={env.NEXT_PUBLIC_WHATSAPP_INVITE}
              className={buttonVariants()}
            >
              uneix-te al grup de whatsapp
              <Plus />
            </Link>
          )}
          <Link
            href="https://iaestelleida.cat"
            className={buttonVariants({ variant: "link" })}
          >
            coneix el que fem
          </Link>
        </>
      }
    >
      <Paragraph>
        {renewed
          ? "com que vas ser membre la campanya passada, hem renovat la teva membresia sense fer-te esperar cap revisió."
          : "el comitè ha revisat la teva sol·licitud i l'ha acceptada: ja ets membre d'iaeste lc lleida."}
      </Paragraph>
      <Paragraph>
        t&apos;hem enviat un correu amb l&apos;enllaç per entrar al teu compte
        del comitè.
      </Paragraph>
    </StatusScreen>
  );
};

export default AcceptedPage;
