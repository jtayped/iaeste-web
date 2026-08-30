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
 * The end of the happy path, reached from the acceptance email.
 *
 * Nothing links here yet: the acceptance email's only button is the
 * first-login link into the admin app (`ADMIN_PUBLIC_ORIGIN`), which does not
 * exist either. Changing where those emails point is a separate task, so this
 * page waits for it rather than duplicating the login flow.
 */
const AcceptedPage = () => (
  <StatusScreen
    icon="user-check"
    tone="positive"
    title="ja ets dels nostres!"
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
      el comitè ha revisat la teva sol·licitud i l&apos;ha acceptada: ja ets
      membre d&apos;iaeste lc lleida.
    </Paragraph>
    <Paragraph>
      al correu d&apos;acceptació hi trobaràs l&apos;enllaç per entrar per
      primer cop al teu compte. és personal i d&apos;un sol ús: no el
      comparteixis.
    </Paragraph>
  </StatusScreen>
);

export default AcceptedPage;
