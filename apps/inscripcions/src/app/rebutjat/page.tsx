import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Globe } from "lucide-react";
import { Button } from "@repo/ui/button";
import { Paragraph } from "@repo/ui/typography";

import StatusScreen from "@/components/status";

export const metadata: Metadata = {
  title: "sobre la teva sol·licitud | iaeste lc lleida",
  robots: { index: false, follow: false },
};

/**
 * The other outcome of a review, reached from the rejection email.
 *
 * As with `/acceptat`, nothing links here yet: the rejection email carries no
 * link at all today. The reason a committee gave is in that email and never
 * in this page — it is written per applicant and this page has no way to know
 * who is reading it.
 */
const RejectedPage = () => (
  <StatusScreen
    icon="mail-question"
    tone="neutral"
    title="aquest cop no ha pogut ser"
    actions={
      <>
        <Button asChild>
          <Link href="mailto:iaeste@udl.cat?subject=Sobre%20la%20meva%20sol%C2%B7licitud">
            escriu-nos
          </Link>
        </Button>
        <Button variant="link" asChild>
          <Link href="https://iaestelleida.cat">
            <Globe />
            més sobre iaeste lleida
          </Link>
        </Button>
      </>
    }
  >
    <Paragraph>
      el comitè ha revisat la teva sol·licitud i aquest curs no l&apos;ha pogut
      acceptar. al correu que t&apos;hem enviat hi trobaràs el motiu, si
      n&apos;hi havia.
    </Paragraph>
    <Paragraph>
      no et desanimis: pots tornar a presentar-la quan obrim les inscripcions
      del proper curs. si tens qualsevol dubte, respon aquell correu o
      escriu-nos.
    </Paragraph>
  </StatusScreen>
);

export default RejectedPage;
