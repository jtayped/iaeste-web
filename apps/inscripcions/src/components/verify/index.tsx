"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, RotateCw, TriangleAlert } from "lucide-react";
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
 * The token arrives in the URL because that is what an email link can carry,
 * but it is sent to the API in a POST body and the page then replaces itself
 * with a token-free URL, so the token does not linger in history or in a
 * shared link.
 */
const Verify = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [failed, setFailed] = useState(false);
  const attempted = useRef(false);

  const verify = useCallback(async () => {
    const token = readToken(searchParams.get("token"));

    if (!token) {
      router.replace("/enllac-caducat");
      return;
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
        icon={Loader2}
        iconClassName="animate-spin"
        title="Verificant el teu correu…"
      >
        <Paragraph>Un moment, si us plau.</Paragraph>
      </StatusScreen>
    );
  }

  return (
    <StatusScreen
      icon={TriangleAlert}
      tone="warning"
      title="No hem pogut verificar-ho ara mateix"
      actions={
        <>
          <Button onClick={retry}>
            <RotateCw />
            Torna-ho a provar
          </Button>
          <Button variant="link" asChild>
            <Link href="/">Torna a l&apos;inici</Link>
          </Button>
        </>
      }
    >
      <Paragraph>
        Hi ha hagut un problema de connexió amb el servidor. L&apos;enllaç
        segueix sent vàlid: torna-ho a provar d&apos;aquí a un moment.
      </Paragraph>
    </StatusScreen>
  );
};

export default Verify;
