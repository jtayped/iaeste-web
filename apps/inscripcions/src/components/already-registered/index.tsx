import React from "react";
import Link from "next/link";
import { Button } from "@repo/ui/button";
import { Paragraph } from "@repo/ui/typography";

import StatusScreen from "@/components/status";

/**
 * Reached when the API answers `ALREADY_REGISTERED`: this email already has a
 * registration for the campaign that is open.
 *
 * The API never returns the existing registration's id. This page therefore
 * never offers a resend for an id remembered by the browser, because a shared
 * device might remember a different applicant's registration.
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
        si encara no has verificat l&apos;adreça, busca el correu de verificació
        a la teva safata d&apos;entrada o a la carpeta de correu brossa:
        l&apos;enllaç que hi ha continua sent el bo.
      </Paragraph>
    </StatusScreen>
  );
};

export default AlreadyRegistered;
