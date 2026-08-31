"use client";

import * as React from "react";
import { Loader2, MailCheck } from "lucide-react";

import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";

import { signIn } from "@/lib/auth-client";

type State =
  | { status: "idle" }
  | { status: "sending" }
  | { status: "sent"; email: string }
  | { status: "failed"; message: string };

/**
 * Magic-link request.
 *
 * The success state is deliberately identical for a known and an unknown
 * address. Better Auth is configured with `disableSignUp: true`, so a request
 * for an address with no account sends nothing — but saying so here would turn
 * this form into an oracle for who is on the committee. See `docs/auth.md`.
 *
 * Only a transport failure is surfaced as an error, because that one is the
 * user's problem to retry.
 *
 * `errorCallbackURL` points a *failed verification* back at `/sign-in`
 * instead of Better Auth's default (the same `callbackURL`, which the
 * authenticated shell would immediately bounce to `/sign-in` anyway, losing
 * the `?error=` query in the process). This does not reopen the oracle above:
 * reaching that error page requires the token from the emailed link, which an
 * anonymous requester never gets. See the `?error=` handling in
 * `app/sign-in/page.tsx`.
 */
export function SignInForm() {
  const [email, setEmail] = React.useState("");
  const [state, setState] = React.useState<State>({ status: "idle" });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;

    setState({ status: "sending" });
    const { error } = await signIn.magicLink({
      email: trimmed,
      callbackURL: "/",
      errorCallbackURL: "/sign-in",
    });

    if (error) {
      setState({
        status: "failed",
        message:
          error.message ?? "no hem pogut enviar l'enllaç. torna-ho a provar.",
      });
      return;
    }
    setState({ status: "sent", email: trimmed });
  }

  if (state.status === "sent") {
    return (
      <div className="space-y-3 rounded-lg border border-border p-5">
        <MailCheck className="size-5 text-secondary" aria-hidden />
        <div className="space-y-1">
          <p className="text-sm font-medium">revisa el teu correu</p>
          <p className="text-sm text-muted-foreground">
            si <span className="text-foreground">{state.email}</span> té accés a
            l&apos;administració, hi trobaràs un enllaç per entrar. caduca en 10
            minuts.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="-ml-3"
          onClick={() => setState({ status: "idle" })}
        >
          fes servir una altra adreça
        </Button>
      </div>
    );
  }

  const sending = state.status === "sending";

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="email">correu electrònic</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          autoFocus
          placeholder="nom@udl.cat"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={state.status === "failed"}
          aria-describedby={
            state.status === "failed" ? "sign-in-error" : undefined
          }
        />
      </div>

      {state.status === "failed" ? (
        <p id="sign-in-error" role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      ) : null}

      <Button type="submit" className="w-full gap-2" disabled={sending}>
        {sending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : null}
        {sending ? "enviant l'enllaç…" : "envia'm l'enllaç d'accés"}
      </Button>

      <p className="text-xs text-muted-foreground">
        no hi ha contrasenyes. entres amb un enllaç d&apos;un sol ús que
        t&apos;enviem per correu.
      </p>
    </form>
  );
}
