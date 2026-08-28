"use client";

import { Info, ShieldAlert, TriangleAlert } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@repo/ui/alert";
import { Button } from "@repo/ui/button";

/**
 * The confirmation step for a non-UdL address.
 *
 * The API answers 409 unless the request carries `allowExternalDomain: true`,
 * and the point of that flag is that a human looked at the domain and meant
 * it. So the form checks the domain itself and asks here *before* sending,
 * rather than letting the round trip be the prompt — a mistyped `@udl.ct` is
 * the case this is really for.
 */
export function ExternalDomainConfirm({
  email,
  pending,
  onConfirm,
}: {
  email: string;
  pending: boolean;
  onConfirm: () => void;
}) {
  const domain = email.split("@").at(-1) ?? "";

  return (
    <Alert>
      <TriangleAlert className="size-4" aria-hidden />
      <AlertTitle>això no és una adreça de la udl</AlertTitle>
      <AlertDescription>
        <p>
          <span className="font-mono text-xs">{domain}</span> no és{" "}
          <span className="font-mono text-xs">udl.cat</span>. comprova que no
          sigui una errada abans de continuar: el convit anirà a aquesta adreça
          i qui el rebi entrarà al comitè.
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="mt-3 min-h-11 w-full sm:min-h-9 sm:w-auto"
          disabled={pending}
          onClick={onConfirm}
        >
          convida igualment
        </Button>
      </AlertDescription>
    </Alert>
  );
}

/** The other 409: a pending invitation for this email and campaign exists. */
export function DuplicateInviteNotice({ detail }: { detail: string }) {
  return (
    <Alert>
      <Info className="size-4" aria-hidden />
      <AlertTitle>ja hi ha un convit obert per aquesta adreça</AlertTitle>
      <AlertDescription>
        no n&apos;hem enviat un de nou. si no els ha arribat, fes servir
        «reenvia» a la fila corresponent; si vols canviar-hi alguna cosa,
        anul·la&apos;l primer. {detail}
      </AlertDescription>
    </Alert>
  );
}

/** 403 from the `invitations.grant_admin` capability check. */
export function GrantAdminDeniedNotice({ detail }: { detail: string }) {
  return (
    <Alert>
      <ShieldAlert className="size-4" aria-hidden />
      <AlertTitle>no pots convidar administradors</AlertTitle>
      <AlertDescription>
        el teu compte pot convidar membres, però no atorgar el rol
        d&apos;administrador. demana-ho a qui porti el comitè. {detail}
      </AlertDescription>
    </Alert>
  );
}
