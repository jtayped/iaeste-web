import type { Metadata } from "next";

import { NoAccessNotice } from "@/components/sign-in/no-access-notice";
import { SignInForm } from "@/components/sign-in/sign-in-form";
import {
  isVerifyErrorCode,
  VerifyErrorNotice,
} from "@/components/sign-in/verify-error-notice";
import { adminTitle } from "@/lib/page-title";

// The one page with no `<PageShell>`: it is outside the authenticated layout,
// so there is no sidebar to place it in and no breadcrumb to climb. It still
// titles itself through `adminTitle`, so the tab matches every other page.
export const metadata: Metadata = {
  title: { absolute: adminTitle("entra") },
};

/**
 * Outside the authenticated layout on purpose — the shell's session check
 * redirects here, so putting this page inside it would loop.
 *
 * It reads no session and no API; only the form it mounts talks to the
 * network. The `?error=no-access` case is set by the shell when a signed-in
 * account lacks `admin.access`; the other `?error=` values come straight
 * from Better Auth's magic-link verify failing (see `SignInForm` and
 * `VerifyErrorNotice`).
 */
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const error = (await searchParams).error;
  const noAccess = error === "no-access";
  const verifyErrorCode =
    typeof error === "string" && isVerifyErrorCode(error) ? error : undefined;

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2">
          <span
            aria-hidden
            className="flex size-9 items-center justify-center rounded-md bg-primary text-xs font-semibold tracking-tight text-primary-foreground"
          >
            LC
          </span>
          <h1 className="text-lg font-semibold tracking-tight">
            administració iaeste lleida
          </h1>
          <p className="text-sm text-muted-foreground">
            entra amb el correu amb què ets al comitè.
          </p>
        </div>
        {noAccess ? <NoAccessNotice /> : null}
        {verifyErrorCode ? <VerifyErrorNotice code={verifyErrorCode} /> : null}
        <SignInForm />
      </div>
    </main>
  );
}
