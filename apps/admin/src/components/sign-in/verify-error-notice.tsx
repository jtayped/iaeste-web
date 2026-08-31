const MESSAGES = {
  new_user_signup_disabled: {
    title: "aquest compte no existeix",
    detail:
      "el correu que has fet servir no té accés a l'administració. si creus que hauria de tenir-ne, parla-ho amb algú del comitè.",
  },
  INVALID_TOKEN: {
    title: "l'enllaç ja no és vàlid",
    detail: "ha caducat o ja s'ha fet servir. demana'n un altre a sota.",
  },
} as const satisfies Record<string, { title: string; detail: string }>;

export type VerifyErrorCode = keyof typeof MESSAGES;

export function isVerifyErrorCode(value: string): value is VerifyErrorCode {
  return value in MESSAGES;
}

/**
 * Shown when the token from an emailed sign-in link failed to verify. Both
 * codes are Better Auth's own (`packages/auth`'s `magicLink` plugin, mounted
 * with `disableSignUp: true`) — see `SignInForm`'s doc comment for why
 * surfacing the reason here doesn't reopen the sign-in form's own
 * known/unknown-address oracle: reaching this page requires the token from
 * the emailed link, which only the address's real inbox receives.
 */
export function VerifyErrorNotice({ code }: { code: VerifyErrorCode }) {
  const { title, detail } = MESSAGES[code];

  return (
    <div
      role="alert"
      className="space-y-1 rounded-lg border border-border bg-default/40 p-4"
    >
      <p className="text-sm font-medium">{title}</p>
      <p className="text-sm text-muted-foreground">{detail}</p>
    </div>
  );
}
