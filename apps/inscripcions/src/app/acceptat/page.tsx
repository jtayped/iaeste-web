import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Plus, UserCheck } from "lucide-react";
import { Button } from "@repo/ui/button";
import { Paragraph } from "@repo/ui/typography";
import { env } from "@repo/env/inscripcions";

import StatusScreen from "@/components/status";

export const metadata: Metadata = {
  title: "Benvingut/da a IAESTE LC Lleida",
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
    icon={UserCheck}
    tone="positive"
    title="Ja ets dels nostres!"
    celebrate
    actions={
      <>
        {env.NEXT_PUBLIC_WHATSAPP_INVITE && (
          <Button asChild>
            <Link href={env.NEXT_PUBLIC_WHATSAPP_INVITE}>
              Uneix-te al grup de WhatsApp
              <Plus />
            </Link>
          </Button>
        )}
        <Button variant="link" asChild>
          <Link href="https://iaestelleida.cat">Coneix el que fem</Link>
        </Button>
      </>
    }
  >
    <Paragraph>
      El comitè ha revisat la teva sol·licitud i l&apos;ha acceptada: ja ets
      membre de IAESTE LC Lleida.
    </Paragraph>
    <Paragraph>
      Al correu d&apos;acceptació hi trobaràs l&apos;enllaç per entrar per
      primer cop al teu compte. És personal i d&apos;un sol ús: no el
      comparteixis.
    </Paragraph>
  </StatusScreen>
);

export default AcceptedPage;
