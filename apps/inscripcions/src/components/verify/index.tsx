"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { RotateCw } from "lucide-react";
import { Button } from "@repo/ui/button";
import { Paragraph } from "@repo/ui/typography";

import StatusScreen from "@/components/status";
import { apiClient } from "@/lib/api";
import {
  mapVerifyResult,
  readToken,
  type VerifyOutcome,
} from "@/lib/registration-flow";

/**
 * The landing page for the link in the verification email.
 *
 * Nothing sends one of these any more — the form proves the address with a
 * six-digit code before it collects anything, so a registration is already
 * `pending_review` when it is written. This page stays because links issued
 * under the old flow are sitting in people's inboxes and must keep working.
 *
 * The token rides in the URL fragment, which browsers do not send to Next, to
 * proxies, or to analytics. Query parameters remain supported for links
 * issued before IA-41; either form is stripped from the address bar before
 * the API request goes out.
 */
const Verify = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [failed, setFailed] = useState(false);
  const attempted = useRef(false);
  const tokenRef = useRef<string | undefined>(undefined);

  const verify = useCallback(async () => {
    const fragmentToken = new URLSearchParams(
      window.location.hash.slice(1),
    ).get("token");
    const token =
      tokenRef.current ??
      readToken(fragmentToken) ??
      readToken(searchParams.get("token"));

    if (!token) {
      router.replace("/enllac-caducat");
      return;
    }

    if (!tokenRef.current) {
      tokenRef.current = token;
      window.history.replaceState(window.history.state, "", "/verificar");
    }

    setFailed(false);

    let outcome: VerifyOutcome;
    try {
      outcome = mapVerifyResult(
        await apiClient.POST("/v1/registrations/verify", { body: { token } }),
      );
    } catch {
      setFailed(true);
      return;
    }

    switch (outcome.kind) {
      case "verified":
        router.replace("/en-revisio");
        return;
      case "invalidToken":
        router.replace("/enllac-caducat");
        return;
      case "failed":
        setFailed(true);
    }
  }, [router, searchParams]);

  // A verification token is single use: running this twice would burn a good
  // token and land a successful applicant on the expired-link screen.
  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;
    void verify();
  }, [verify]);

  async function retry() {
    await verify();
  }

  if (!failed) {
    return (
      <StatusScreen
        icon="loading"
        iconClassName="animate-spin"
        title="verificant el teu correu…"
      >
        <Paragraph>un moment, si us plau.</Paragraph>
      </StatusScreen>
    );
  }

  return (
    <StatusScreen
      icon="warning"
      tone="warning"
      title="no hem pogut verificar-ho ara mateix"
      actions={
        <>
          <Button onClick={retry}>
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
        hi ha hagut un problema de connexió amb el servidor. l&apos;enllaç
        segueix sent vàlid: torna-ho a provar d&apos;aquí a un moment.
      </Paragraph>
    </StatusScreen>
  );
};

export default Verify;
