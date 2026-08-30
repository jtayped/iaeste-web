import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Globe, Send } from "lucide-react";
import { buttonVariants } from "@repo/ui/button";
import ButtonGroup from "@repo/ui/button-group";
import { Paragraph } from "@repo/ui/typography";

import StatusScreen from "@/components/status";

export const metadata: Metadata = {
  title: "inscripcions tancades | iaeste lc lleida",
  robots: { index: false, follow: false },
};

/**
 * Where the form lands when the API answers 409 `CONFLICT`: no campaign is
 * open for registration.
 *
 * This is reached by trying to submit, not by a check on page load — the API
 * has no public campaign-status endpoint yet (IA-52), so the submission
 * attempt is the only way to learn the campaign is closed.
 */
const ClosedCampaignPage = () => (
  <StatusScreen
    icon="calendar-off"
    tone="neutral"
    title="ara mateix no hi ha inscripcions obertes"
    actions={
      <ButtonGroup className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:flex">
        <Link
          href="mailto:iaeste@udl.cat?subject=Inscripci%C3%B3%20a%20IAESTE%20Lleida"
          className={buttonVariants()}
        >
          <Send />
          contacta&apos;ns
        </Link>
        <Link
          href="https://iaestelleida.cat"
          className={buttonVariants({ variant: "outline" })}
        >
          <Globe />
          més informació
        </Link>
      </ButtonGroup>
    }
  >
    <Paragraph>
      el termini per unir-te a iaeste lc lleida està tancat, així que no hem
      pogut desar la teva inscripció.
    </Paragraph>
    <Paragraph>
      obrim inscripcions un cop l&apos;any. si t&apos;interessa, escriu-nos i
      t&apos;avisarem quan torni a estar obert.
    </Paragraph>
  </StatusScreen>
);

export default ClosedCampaignPage;
