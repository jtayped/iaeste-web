import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@repo/ui/button";
import { Paragraph } from "@repo/ui/typography";

import StatusScreen from "@/components/status";

export const metadata: Metadata = {
  title: "enllaç no vàlid | iaeste lc lleida",
  robots: { index: false, follow: false },
};

/**
 * Where `/verificar` lands on `INVALID_TOKEN`.
 *
 * The API answers the same way for an expired link, an already-used one and
 * one that never existed, so this page cannot claim to know which happened.
 * It also has no registration id to resend with — a verification link carries
 * only the token, and the API deliberately offers no way to look a
 * registration up by email — so the honest advice is to look for the most
 * recent email rather than to promise a new one from here.
 */
const ExpiredLinkPage = () => (
  <StatusScreen
    icon="link-off"
    tone="warning"
    title="aquest enllaç ja no serveix"
    actions={
      <Button variant="link" asChild>
        <Link href="/">torna a l&apos;inici</Link>
      </Button>
    }
    footnote={
      <>
        si res d&apos;això funciona, escriu-nos a{" "}
        <a
          className="font-medium text-primary underline underline-offset-4"
          href="mailto:iaeste@udl.cat"
        >
          iaeste@udl.cat
        </a>{" "}
        i ho mirem.
      </>
    }
  >
    <Paragraph>
      l&apos;enllaç de verificació ha caducat, ja s&apos;ha fet servir o no és
      correcte. no et podem dir quin dels tres és: així evitem donar pistes
      sobre inscripcions que no són teves.
    </Paragraph>
    <Paragraph>
      busca a la teva safata el correu de verificació més recent i fes clic a
      l&apos;enllaç d&apos;aquell: cada correu nou invalida els anteriors. si ja
      havies verificat el correu, no has de fer res més.
    </Paragraph>
  </StatusScreen>
);

export default ExpiredLinkPage;
