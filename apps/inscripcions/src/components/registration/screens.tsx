"use client";

import React from "react";
import Link from "next/link";
import { RotateCw } from "lucide-react";

import { Button, buttonVariants } from "@repo/ui/button";
import { Paragraph } from "@repo/ui/typography";

import StatusScreen from "@/components/status";

/** While an invitation token is being looked up. */
export const LoadingInvitationScreen = () => (
  <StatusScreen
    icon="loading"
    iconClassName="animate-spin"
    title="obrint la invitació…"
  >
    <Paragraph>un moment, si us plau.</Paragraph>
  </StatusScreen>
);

export const LoadingDraftScreen = () => (
  <StatusScreen
    icon="loading"
    iconClassName="animate-spin"
    title="obrint la inscripció…"
  >
    <Paragraph>estem comprovant l&apos;enllaç.</Paragraph>
  </StatusScreen>
);

export const InvalidDraftScreen = () => (
  <StatusScreen
    icon="link-off"
    tone="warning"
    title="aquest enllaç no és vàlid"
    actions={
      <Link href="/formulari" className={buttonVariants()}>
        torna a començar
      </Link>
    }
  >
    <Paragraph>
      pot haver caducat, ja s&apos;ha fet servir o haver estat substituït per un
      enllaç més nou.
    </Paragraph>
  </StatusScreen>
);

export const IdentityConflictScreen = () => (
  <StatusScreen
    icon="warning"
    tone="warning"
    title="aquests correus ja són en comptes diferents"
    actions={
      <a href="mailto:iaeste@udl.cat" className={buttonVariants()}>
        escriu-nos
      </a>
    }
  >
    <Paragraph>
      no els podem unir automàticament. escriu-nos a iaeste@udl.cat i ho
      revisarem sense perdre l&apos;historial de cap compte.
    </Paragraph>
  </StatusScreen>
);

/**
 * The single dead end of the invited path.
 *
 * Expired, cancelled, already used, never existed — the API answers all four
 * the same way so that this page cannot be used to find out which invitations
 * exist. The copy therefore does not guess, and points at the one action that
 * can actually help: ask whoever invited you.
 */
export const InvalidInvitationScreen = () => (
  <StatusScreen
    icon="link-off"
    tone="warning"
    title="aquest enllaç no és vàlid"
    actions={
      <Link href="/" className={buttonVariants({ variant: "link" })}>
        torna a l&apos;inici
      </Link>
    }
    footnote={
      <>
        si creus que hi ha un error, escriu-nos a{" "}
        <a
          className="font-medium text-primary underline underline-offset-4"
          href="mailto:iaeste@udl.cat"
        >
          iaeste@udl.cat
        </a>{" "}
        i te&apos;n tornem a enviar un.
      </>
    }
  >
    <Paragraph>
      la invitació ha caducat, s&apos;ha anul·lat o ja s&apos;ha fet servir. no
      et podem dir quin dels tres és: així evitem donar pistes sobre invitacions
      que no són teves.
    </Paragraph>
    <Paragraph>
      si encara vols entrar al comitè, demana a qui et va convidar que te
      n&apos;enviï un de nou.
    </Paragraph>
  </StatusScreen>
);

/** 429. The link is fine; only the pace was wrong. */
export const RateLimitedScreen = ({ onRetry }: { onRetry: () => void }) => (
  <StatusScreen
    icon="warning"
    tone="warning"
    title="hem rebut massa peticions"
    actions={
      <Button onClick={onRetry}>
        <RotateCw />
        torna-ho a provar
      </Button>
    }
  >
    <Paragraph>
      torna-ho a provar d&apos;aquí una estona. l&apos;enllaç segueix sent
      vàlid.
    </Paragraph>
  </StatusScreen>
);

/** A network or server failure, as opposed to a rejected token. */
export const UnreachableScreen = ({ onRetry }: { onRetry: () => void }) => (
  <StatusScreen
    icon="warning"
    tone="warning"
    title="no hem pogut obrir l'enllaç ara mateix"
    actions={
      <>
        <Button onClick={onRetry}>
          <RotateCw />
          torna-ho a provar
        </Button>
        <Link href="/" className={buttonVariants({ variant: "link" })}>
          torna a l&apos;inici
        </Link>
      </>
    }
  >
    <Paragraph>
      hi ha hagut un problema de connexió amb el servidor. l&apos;enllaç segueix
      sent vàlid: torna-ho a provar d&apos;aquí a un moment.
    </Paragraph>
  </StatusScreen>
);

/**
 * Two endings, one screen. Somebody who was already on the team gets the same
 * confirmation without the promise of an email that is not going to arrive.
 */
export const AcceptedScreen = ({
  alreadyMember,
}: {
  alreadyMember: boolean;
}) =>
  alreadyMember ? (
    <StatusScreen
      icon="user-check"
      tone="positive"
      title="ja eres membre de l'equip"
      actions={
        <Link href="/" className={buttonVariants({ variant: "link" })}>
          torna a l&apos;inici
        </Link>
      }
    >
      <Paragraph>
        aquesta invitació era per a un compte que ja forma part del comitè, així
        que no hem canviat res. hem desat les dades que acabes d&apos;omplir.
      </Paragraph>
    </StatusScreen>
  ) : (
    <StatusScreen
      icon="user-check"
      tone="positive"
      title="ja ets membre de l'equip"
      celebrate
      actions={
        <Link href="/" className={buttonVariants({ variant: "link" })}>
          torna a l&apos;inici
        </Link>
      }
    >
      <Paragraph>
        benvingut/da a iaeste lleida! rebràs un correu amb un enllaç per entrar
        al dashboard del comitè.
      </Paragraph>
    </StatusScreen>
  );
