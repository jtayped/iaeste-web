import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Button } from "@repo/ui/button";
import { Paragraph } from "@repo/ui/typography";

import StatusScreen from "@/components/status";

export const metadata: Metadata = {
  title: "Inscripció en revisió | IAESTE LC Lleida",
  robots: { index: false, follow: false },
};

/** Where `/verificar` lands after the API confirms the token. */
const PendingReviewPage = () => (
  <StatusScreen
    icon={ShieldCheck}
    tone="positive"
    title="Correu verificat!"
    actions={
      <Button variant="link" asChild>
        <Link href="/">Torna a l&apos;inici</Link>
      </Button>
    }
  >
    <Paragraph>
      Ja sabem que aquesta adreça és teva i la teva inscripció ha arribat al
      comitè.
    </Paragraph>
    <Paragraph>
      <b>Verificar el correu no et fa membre.</b> Ara el comitè ha de revisar la
      teva sol·licitud, i fins que no l&apos;accepti no tindràs cap compte
      actiu.
    </Paragraph>
    <Paragraph>
      T&apos;escriurem a aquest mateix correu amb la resposta, sigui quina
      sigui. No cal que facis res més.
    </Paragraph>
  </StatusScreen>
);

export default PendingReviewPage;
