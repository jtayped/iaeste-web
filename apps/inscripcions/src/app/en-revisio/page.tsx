import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@repo/ui/button";
import { Paragraph } from "@repo/ui/typography";

import StatusScreen from "@/components/status";

export const metadata: Metadata = {
  title: "inscripció en revisió | iaeste lc lleida",
  robots: { index: false, follow: false },
};

/**
 * The end of the public path, reached straight from the form now that the
 * address is proven before submission. Also where `/verificar` lands for the
 * older link-in-the-email flow, which is why the copy leads with the
 * application rather than with the verification.
 */
const PendingReviewPage = () => (
  <StatusScreen
    icon="shield-check"
    tone="positive"
    title="sol·licitud enviada!"
    actions={
      <Link href="/" className={buttonVariants({ variant: "link" })}>
        torna a l&apos;inici
      </Link>
    }
  >
    <Paragraph>
      ja hem comprovat que l&apos;adreça és teva i la teva sol·licitud ha
      arribat al comitè.
    </Paragraph>
    <Paragraph>
      <b>això encara no et fa membre.</b> ara el comitè l&apos;ha de revisar, i
      fins que no l&apos;accepti no tindràs cap compte actiu.
    </Paragraph>
    <Paragraph>
      t&apos;escriurem a aquest mateix correu amb la resposta, sigui quina
      sigui. no cal que facis res més.
    </Paragraph>
  </StatusScreen>
);

export default PendingReviewPage;
