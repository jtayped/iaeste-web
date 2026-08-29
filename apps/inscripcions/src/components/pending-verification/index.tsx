"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Info, Loader2, RotateCw, TriangleAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@repo/ui/alert";
import { Button } from "@repo/ui/button";
import { Paragraph } from "@repo/ui/typography";

import StatusScreen from "@/components/status";
import { apiClient } from "@/lib/api";
import { readRegistrationId } from "@/lib/registration-flow";
import { recallRegistrationId } from "@/lib/registration-cookie";

/** Long enough to stop a frustrated user mashing the button; the real limit is server-side. */
const COOLDOWN_SECONDS = 45;

type ResendState = "idle" | "sending" | "sent" | "failed";

const PendingVerification = () => {
  const searchParams = useSearchParams();
  const [id, setId] = useState<string | undefined>(() =>
    readRegistrationId(searchParams.get("id")),
  );
  const [state, setState] = useState<ResendState>("idle");
  const [cooldown, setCooldown] = useState(0);

  // Someone who bookmarked this page without the id still gets the resend
  // button if this browser is the one that created the registration.
  useEffect(() => {
    setId((current) => current ?? recallRegistrationId());
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((left) => left - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function resend() {
    if (!id || state === "sending" || cooldown > 0) return;

    setState("sending");
    try {
      const result = await apiClient.POST(
        "/v1/registrations/{id}/resend-verification",
        {
          params: { path: { id } },
        },
      );
      if (result.error) {
        setState("failed");
        return;
      }
      setState("sent");
      setCooldown(COOLDOWN_SECONDS);
    } catch {
      setState("failed");
    }
  }

  return (
    <StatusScreen
      icon="mail-check"
      tone="positive"
      title="revisa el teu correu"
      actions={
        <>
          {id && (
            <Button
              onClick={resend}
              disabled={state === "sending" || cooldown > 0}
              variant="outline"
            >
              {state === "sending" ? (
                <>
                  <Loader2 className="animate-spin" />
                  enviant…
                </>
              ) : cooldown > 0 ? (
                `torna-ho a provar en ${cooldown} s`
              ) : (
                <>
                  <RotateCw />
                  torna&apos;m a enviar el correu
                </>
              )}
            </Button>
          )}
          <Button variant="link" asChild>
            <Link href="/">torna a l&apos;inici</Link>
          </Button>
        </>
      }
      footnote={
        <>
          {state === "sent" && (
            <Alert className="text-left">
              <Info />
              <AlertTitle>fet</AlertTitle>
              <AlertDescription>
                si la teva inscripció encara està pendent de verificar,
                t&apos;hem enviat un correu nou. per seguretat no et podem dir
                res més sobre l&apos;estat d&apos;una adreça concreta.
              </AlertDescription>
            </Alert>
          )}
          {state === "failed" && (
            <Alert variant="destructive" className="text-left">
              <TriangleAlert />
              <AlertTitle>no hem pogut fer la petició</AlertTitle>
              <AlertDescription>
                comprova la connexió i torna-ho a provar.
              </AlertDescription>
            </Alert>
          )}
          {!id && (
            <Alert className="text-left">
              <Info />
              <AlertTitle>
                no podem reenviar el correu des d&apos;aquí
              </AlertTitle>
              <AlertDescription>
                has arribat a aquesta pàgina sense la referència de la
                inscripció. busca el correu de verificació més recent a la teva
                safata; si no el trobes, escriu-nos a iaeste@udl.cat.
              </AlertDescription>
            </Alert>
          )}
        </>
      }
    >
      <Paragraph>
        hem enviat un enllaç de verificació al correu de la udl que ens has
        indicat. fes-hi clic per confirmar que l&apos;adreça és teva i que la
        inscripció arribi al comitè.
      </Paragraph>
      <Paragraph>
        si no el veus, mira la carpeta de correu brossa. l&apos;enllaç caduca,
        així que fes-hi clic com abans millor.
      </Paragraph>
    </StatusScreen>
  );
};

export default PendingVerification;
