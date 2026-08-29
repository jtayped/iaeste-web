"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@repo/ui/button";

import { signOut } from "@/lib/auth-client";

/**
 * Shown when the shell bounced someone here who *is* signed in but lacks
 * `admin.access`.
 *
 * Without this they would be in a loop: their cookie is valid, so requesting
 * another magic link and following it lands them back on `/`, which redirects
 * back here. Saying what happened and offering to sign out is the way out.
 */
export function NoAccessNotice() {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  return (
    <div
      role="alert"
      className="space-y-3 rounded-lg border border-border bg-muted/40 p-4"
    >
      <p className="text-sm font-medium">aquest compte no té accés</p>
      <p className="text-sm text-muted-foreground">
        has entrat correctament, però el teu compte no té permisos
        d&apos;administració. si creus que és un error, parla-ho amb algú del
        comitè.
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => {
          setPending(true);
          void signOut().then(() => {
            router.replace("/sign-in");
            router.refresh();
          });
        }}
      >
        {pending ? "tancant la sessió…" : "tanca la sessió"}
      </Button>
    </div>
  );
}
