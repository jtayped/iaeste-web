import React from "react";
import Link from "next/link";
import { Button } from "@repo/ui/button";
import { Paragraph } from "@repo/ui/typography";

import StatusScreen from "@/components/status";

/**
 * Reached when the API answers `ALREADY_REGISTERED`: this email already has a
 * registration for the campaign that is open.
 *
 * Rare now that the form checks for an existing registration at the code
 * step and says so before anyone fills anything in — this is the backstop for
 * the race where a second submission lands between the two.
 */
const AlreadyRegistered = () => {
  return (
    <StatusScreen
      icon="mail-question"
      tone="warning"
      title="ja tenim la teva inscripció"
      actions={
        <Button variant="link" asChild>
          <Link href="/">torna a l&apos;inici</Link>
        </Button>
      }
      footnote={
        <>
          si creus que hi ha hagut un error, escriu-nos a{" "}
          <a
            className="font-medium text-primary underline underline-offset-4"
            href="mailto:iaeste@udl.cat"
          >
            iaeste@udl.cat
          </a>
          .
        </>
      }
    >
      <Paragraph>
        aquest correu ja consta inscrit en la convocatòria oberta, així que no
        cal que ho tornis a fer.
      </Paragraph>
      <Paragraph>
        el comitè la revisarà i t&apos;escriurà a aquesta mateixa adreça amb la
        resposta, sigui quina sigui. no cal que facis res més.
      </Paragraph>
    </StatusScreen>
  );
};

export default AlreadyRegistered;
