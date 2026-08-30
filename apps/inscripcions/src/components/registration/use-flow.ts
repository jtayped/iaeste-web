"use client";

import React from "react";
import { useRouter } from "next/navigation";

import { apiClient } from "@/lib/api";
import type { CodeStep, ProfileForm } from "@/lib/form-schema";
import { mapAcceptResult, mapLookupResult } from "@/lib/invitation-flow";
import {
  mapStartResult,
  mapSubmitResult,
  mapVerifyCodeResult,
  readToken,
} from "@/lib/registration-flow";

import type { DetailsContext } from "./details-step";
import {
  toInvitationContext,
  toMappedIssues,
  toRequestProfile,
  toSessionContext,
  unmappedMessage,
  type MappedFieldIssue,
} from "./context";

const NETWORK_FAILURE =
  "no hem pogut connectar amb el servidor. comprova la connexió i torna-ho a provar.";
const GENERIC_FAILURE =
  "no hem pogut desar la inscripció. torna-ho a provar d'aquí a un moment.";
const RATE_LIMITED =
  "hem rebut massa peticions. torna-ho a provar d'aquí una estona.";

export type Mode =
  | { kind: "public" }
  /** `/convit#token=…`. The token never reaches the server as part of a URL. */
  | { kind: "invitation" };

export type Stage =
  | { kind: "loadingInvitation" }
  | { kind: "invalidInvitation" }
  | { kind: "rateLimited"; retry: () => void }
  | { kind: "unreachable"; retry: () => void }
  | { kind: "email" }
  | { kind: "code"; email: string }
  | { kind: "details"; context: DetailsContext }
  | { kind: "accepted"; alreadyMember: boolean };

/**
 * The whole state machine behind both ways into the registration form, kept
 * out of the component so the rendering stays a flat switch over `stage`.
 *
 * The two paths converge deliberately early: once an address is proven —
 * by a code on the public path, by the invitation token on the other — both
 * produce the same `DetailsContext` and the same last screen.
 */
export function useRegistrationFlow(mode: Mode) {
  const router = useRouter();
  const invited = mode.kind === "invitation";

  const [stage, setStage] = React.useState<Stage>(
    invited ? { kind: "loadingInvitation" } : { kind: "email" },
  );
  const [busy, setBusy] = React.useState(false);
  const [resending, setResending] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>();
  const [fieldIssues, setFieldIssues] = React.useState<
    readonly MappedFieldIssue[]
  >([]);
  const [resendIn, setResendIn] = React.useState(0);
  // Survives a trip forward to the code step and back, so "canvia el correu"
  // and a lapsed session both return to a field that is already filled in.
  const [email, setEmail] = React.useState("");

  // The proof carried between steps. Refs, not state: nothing renders them,
  // and a re-render must never be able to drop one mid-flow.
  const emailToken = React.useRef<string | undefined>(undefined);
  const invitationToken = React.useRef<string | undefined>(undefined);
  // Accepting an invitation is single use. Without this, a double-click fires
  // the request twice and the second answer — a token that has just been
  // consumed — would drop a successful new member onto the invalid screen.
  const accepting = React.useRef(false);
  const lookedUp = React.useRef(false);

  React.useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((left) => left - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  // --- invitation entry ---------------------------------------------------

  const lookupInvitation = React.useCallback(async () => {
    const fragment = new URLSearchParams(window.location.hash.slice(1)).get(
      "token",
    );
    const token = invitationToken.current ?? readToken(fragment);

    if (!token) {
      setStage({ kind: "invalidInvitation" });
      return;
    }

    if (!invitationToken.current) {
      invitationToken.current = token;
      // Strip it from the address bar so a screenshot or a shared URL cannot
      // hand someone else the committee.
      window.history.replaceState(window.history.state, "", "/convit");
    }

    setStage({ kind: "loadingInvitation" });

    const retry = () => void lookupInvitation();

    let outcome;
    try {
      outcome = mapLookupResult(
        await apiClient.POST("/v1/invitations/lookup", { body: { token } }),
      );
    } catch {
      setStage({ kind: "unreachable", retry });
      return;
    }

    switch (outcome.kind) {
      case "ok":
        setStage({
          kind: "details",
          context: toInvitationContext(outcome.invitation),
        });
        return;
      case "invalid":
        setStage({ kind: "invalidInvitation" });
        return;
      case "rateLimited":
        setStage({ kind: "rateLimited", retry });
        return;
      case "failed":
        setStage({ kind: "unreachable", retry });
    }
  }, []);

  React.useEffect(() => {
    if (!invited || lookedUp.current) return;
    lookedUp.current = true;
    void lookupInvitation();
  }, [invited, lookupInvitation]);

  // --- public entry -------------------------------------------------------

  async function sendCode(address: string, isResend: boolean) {
    setEmail(address);
    setError(undefined);
    if (isResend) setResending(true);
    else setBusy(true);

    let outcome;
    try {
      outcome = mapStartResult(
        await apiClient.POST("/v1/registrations/start", {
          body: { email: address },
        }),
      );
    } catch {
      setBusy(false);
      setResending(false);
      setError(NETWORK_FAILURE);
      return;
    }

    setBusy(false);
    setResending(false);

    switch (outcome.kind) {
      case "sent":
        setResendIn(outcome.resendAfterSeconds);
        setStage({ kind: "code", email: address });
        return;
      case "closed":
        router.push("/inscripcions-tancades");
        return;
      case "rateLimited":
        setError(RATE_LIMITED);
        return;
      case "invalid":
        setError(unmappedMessage(outcome.issues));
        return;
      case "failed":
        setError(GENERIC_FAILURE);
    }
  }

  async function submitCode(address: string, values: CodeStep) {
    setError(undefined);
    setBusy(true);

    let outcome;
    try {
      outcome = mapVerifyCodeResult(
        await apiClient.POST("/v1/registrations/verify-code", {
          body: { email: address, code: values.code },
        }),
      );
    } catch {
      setBusy(false);
      setError(NETWORK_FAILURE);
      return;
    }

    setBusy(false);

    switch (outcome.kind) {
      case "ok":
        emailToken.current = outcome.session.token;
        setStage({
          kind: "details",
          context: toSessionContext(outcome.session),
        });
        return;
      case "badCode":
        setError(
          "aquest codi no és correcte o ja ha caducat. torna-ho a provar.",
        );
        return;
      case "rateLimited":
        setError(
          "hem rebut massa intents. torna-ho a provar d'aquí una estona.",
        );
        return;
      case "failed":
        setError(GENERIC_FAILURE);
    }
  }

  // --- the shared last step -----------------------------------------------

  async function submitPublicDetails(values: ProfileForm) {
    const token = emailToken.current;
    if (!token) {
      setStage({ kind: "email" });
      setError("la sessió ha caducat. torna a començar pel correu.");
      return;
    }

    setError(undefined);
    setFieldIssues([]);
    setBusy(true);

    let outcome;
    try {
      outcome = mapSubmitResult(
        await apiClient.POST("/v1/registrations", {
          body: { emailToken: token, ...toRequestProfile(values) },
        }),
      );
    } catch {
      setBusy(false);
      setError(NETWORK_FAILURE);
      return;
    }

    setBusy(false);

    switch (outcome.kind) {
      case "created":
        router.push("/en-revisio");
        return;
      case "closed":
        router.push("/inscripcions-tancades");
        return;
      case "alreadyRegistered":
        router.push("/ja-inscrit");
        return;
      case "expiredSession":
        // The token is spent either way, so going back to step one is the
        // only honest option — a retry with the same token cannot work.
        emailToken.current = undefined;
        setStage({ kind: "email" });
        setError(
          "has trigat massa i hem hagut de tancar la sessió. torna a demanar un codi.",
        );
        return;
      case "invalid":
        setFieldIssues(toMappedIssues(outcome.issues));
        setError(unmappedMessage(outcome.issues));
        return;
      case "failed":
        setError(GENERIC_FAILURE);
    }
  }

  async function submitInvitedDetails(values: ProfileForm) {
    const token = invitationToken.current;
    if (!token || accepting.current) return;

    accepting.current = true;
    setError(undefined);
    setBusy(true);

    let outcome;
    try {
      outcome = mapAcceptResult(
        await apiClient.POST("/v1/invitations/accept", {
          body: { token, ...toRequestProfile(values) },
        }),
      );
    } catch {
      accepting.current = false;
      setBusy(false);
      setError(NETWORK_FAILURE);
      return;
    }

    setBusy(false);

    switch (outcome.kind) {
      case "accepted":
        // The guard is deliberately not released: the token is spent.
        setStage({ kind: "accepted", alreadyMember: outcome.alreadyMember });
        return;
      case "invalid":
        setStage({ kind: "invalidInvitation" });
        return;
      case "rateLimited":
        // Retryable, so the form stays and the guard comes back off.
        accepting.current = false;
        setError(RATE_LIMITED);
        return;
      case "failed":
        accepting.current = false;
        setError(
          "no hem pogut desar les dades. torna-ho a provar d'aquí a un moment.",
        );
    }
  }

  return {
    invited,
    stage,
    busy,
    resending,
    error,
    fieldIssues,
    resendIn,
    email,
    sendCode,
    submitCode,
    submitDetails: invited ? submitInvitedDetails : submitPublicDetails,
    changeEmail() {
      setError(undefined);
      setStage({ kind: "email" });
    },
  };
}
