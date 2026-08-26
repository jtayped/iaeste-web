"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { MailQuestion } from "lucide-react";
import { Button } from "@repo/ui/button";
import { Paragraph } from "@repo/ui/typography";

import StatusScreen from "@/components/status";
import { recallRegistrationId } from "@/lib/registration-cookie";

/**
 * Reached when the API answers `ALREADY_REGISTERED`: this email already has a
 * registration for the campaign that is open.
 *
 * The API never returns the existing registration's id — it will not confirm
 * anything about an address it was given — so a resend shortcut is only
 * possible when this same browser is the one that registered.
 */
const AlreadyRegistered = () => {
  const [id, setId] = useState<string | undefined>();

  useEffect(() => {
    setId(recallRegistrationId());
  }, []);

  return (
    <StatusScreen
      icon={MailQuestion}
      tone="warning"
      title="Ja tenim la teva inscripció"
      actions={
        <>
          {id && (
            <Button asChild>
              <Link href={`/verificacio-pendent?id=${encodeURIComponent(id)}`}>
                Reenvia&apos;m el correu de verificació
              </Link>
            </Button>
          )}
          <Button variant="link" asChild>
            <Link href="/">Torna a l&apos;inici</Link>
          </Button>
        </>
      }
      footnote={
        <>
          Si creus que hi ha hagut un error, escriu-nos a{" "}
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
        Aquest correu ja consta inscrit en la convocatòria oberta, així que no
        cal que ho tornis a fer.
      </Paragraph>
      <Paragraph>
        Si encara no has verificat l&apos;adreça, busca el correu de verificació
        a la teva safata d&apos;entrada o a la carpeta de correu brossa:
        l&apos;enllaç que hi ha continua sent el bo.
      </Paragraph>
    </StatusScreen>
  );
};

export default AlreadyRegistered;
