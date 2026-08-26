import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { CalendarOff, Globe, Send } from "lucide-react";
import { Button } from "@repo/ui/button";
import ButtonGroup from "@repo/ui/button-group";
import { Paragraph } from "@repo/ui/typography";

import StatusScreen from "@/components/status";

export const metadata: Metadata = {
  title: "Inscripcions tancades | IAESTE LC Lleida",
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
    icon={CalendarOff}
    tone="neutral"
    title="Ara mateix no hi ha inscripcions obertes"
    actions={
      <ButtonGroup className="grid grid-cols-2 md:flex">
        <Button asChild>
          <Link href="mailto:iaeste@udl.cat?subject=Inscripci%C3%B3%20a%20IAESTE%20Lleida">
            <Send />
            Contacta&apos;ns
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="https://iaestelleida.cat">
            <Globe />
            Més informació
          </Link>
        </Button>
      </ButtonGroup>
    }
  >
    <Paragraph>
      El termini per unir-te a IAESTE LC Lleida està tancat, així que no hem
      pogut desar la teva inscripció.
    </Paragraph>
    <Paragraph>
      Obrim inscripcions un cop l&apos;any. Si t&apos;interessa, escriu-nos i
      t&apos;avisarem quan torni a estar obert.
    </Paragraph>
  </StatusScreen>
);

export default ClosedCampaignPage;
