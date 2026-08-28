"use client";

import React from "react";
import Link from "next/link";
import { RotateCw } from "lucide-react";

import { Button } from "@repo/ui/button";
import { Paragraph } from "@repo/ui/typography";

import StatusScreen from "@/components/status";

/** While the token is being looked up. */
export const LoadingScreen = () => (
  <StatusScreen
    icon="loading"
    iconClassName="animate-spin"
    title="obrint el convit…"
  >
    <Paragraph>un moment, si us plau.</Paragraph>
  </StatusScreen>
);

/**
 * The single dead end.
 *
 * Expired, cancelled, already used, never existed — the API answers all four
 * the same way so that this page cannot be used to find out which invitations
 * exist. The copy therefore does not guess, and points at the one action that
 * can actually help: ask whoever invited you.
 */
export const InvalidScreen = () => (
  <StatusScreen
    icon="link-off"
    tone="warning"
    title="aquest enllaç no és vàlid"
    actions={
      <Button variant="link" asChild>
        <Link href="/">torna a l&apos;inici</Link>
      </Button>
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
      el convit ha caducat, s&apos;ha anul·lat o ja s&apos;ha fet servir. no et
      podem dir quin dels tres és: així evitem donar pistes sobre convits que no
      són teus.
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
export const FailedScreen = ({ onRetry }: { onRetry: () => void }) => (
  <StatusScreen
    icon="warning"
    tone="warning"
    title="no hem pogut obrir el convit ara mateix"
    actions={
      <>
        <Button onClick={onRetry}>
          <RotateCw />
          torna-ho a provar
        </Button>
        <Button variant="link" asChild>
          <Link href="/">torna a l&apos;inici</Link>
        </Button>
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
        <Button variant="link" asChild>
          <Link href="/">torna a l&apos;inici</Link>
        </Button>
      }
    >
      <Paragraph>
        aquest convit era per a un compte que ja forma part del comitè, així que
        no hem canviat res. hem desat les dades que acabes d&apos;omplir.
      </Paragraph>
    </StatusScreen>
  ) : (
    <StatusScreen
      icon="user-check"
      tone="positive"
      title="ja ets membre de l'equip"
      celebrate
      actions={
        <Button variant="link" asChild>
          <Link href="/">torna a l&apos;inici</Link>
        </Button>
      }
    >
      <Paragraph>
        benvingut/da a iaeste lleida! rebràs un correu amb un enllaç per entrar
        al panell del comitè.
      </Paragraph>
    </StatusScreen>
  );
