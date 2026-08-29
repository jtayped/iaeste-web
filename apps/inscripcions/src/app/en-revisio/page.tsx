import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@repo/ui/button";
import { Paragraph } from "@repo/ui/typography";

import StatusScreen from "@/components/status";

export const metadata: Metadata = {
  title: "inscripció en revisió | iaeste lc lleida",
  robots: { index: false, follow: false },
};

/** Where `/verificar` lands after the API confirms the token. */
const PendingReviewPage = () => (
  <StatusScreen
    icon="shield-check"
    tone="positive"
    title="correu verificat!"
    actions={
      <Button variant="link" asChild>
        <Link href="/">torna a l&apos;inici</Link>
      </Button>
    }
  >
    <Paragraph>
      ja sabem que aquesta adreça és teva i la teva inscripció ha arribat al
      comitè.
    </Paragraph>
    <Paragraph>
      <b>verificar el correu no et fa membre.</b> ara el comitè ha de revisar la
      teva sol·licitud, i fins que no l&apos;accepti no tindràs cap compte
      actiu.
    </Paragraph>
    <Paragraph>
      t&apos;escriurem a aquest mateix correu amb la resposta, sigui quina
      sigui. no cal que facis res més.
    </Paragraph>
  </StatusScreen>
);

export default PendingReviewPage;
