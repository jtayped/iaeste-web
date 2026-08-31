"use client";

import React from "react";
import { useRouter } from "next/navigation";

import type { MemberEmailKind } from "@repo/constants/validators/member-email";

import { apiClient } from "@/lib/api";
import type { EmailStep, EmailStepValues } from "@/lib/form-schema";
import { mapLookupResult } from "@/lib/invitation-flow";
import {
  mapStartResult,
  mapVerifyDraftResult,
  readToken,
  type Session,
} from "@/lib/registration-flow";

import {
  toInvitationContext,
  toSessionContext,
  unmappedMessage,
  type MappedFieldIssue,
} from "./context";
import { EMPTY_EMAILS, type Mode, type Stage } from "./flow-types";
import { useSubmitDetails } from "./use-submit-details";
export type { Mode, Stage } from "./flow-types";

const NETWORK_FAILURE =
  "no hem pogut connectar amb el servidor. comprova la connexió i torna-ho a provar.";
const GENERIC_FAILURE =
  "no hem pogut desar la inscripció. torna-ho a provar d'aquí a un moment.";
const RATE_LIMITED =
  "hem rebut massa peticions. torna-ho a provar d'aquí una estona.";
const DRAFT_SESSION_KEY = "iaeste-registration-draft-session";

export function useRegistrationFlow(mode: Mode) {
  const router = useRouter();
  const invited = mode.kind === "invitation";
  const [stage, setStage] = React.useState<Stage>(
    invited ? { kind: "loadingInvitation" } : { kind: "loadingDraft" },
  );
  const [busy, setBusy] = React.useState(false);
  const [resending, setResending] = React.useState<MemberEmailKind>();
  const [error, setError] = React.useState<string>();
  const [fieldIssues, setFieldIssues] = React.useState<
    readonly MappedFieldIssue[]
  >([]);
  const [emails, setEmails] = React.useState<EmailStepValues>(EMPTY_EMAILS);

  const emailToken = React.useRef<string | undefined>(undefined);
  const invitationToken = React.useRef<string | undefined>(undefined);
  const initialised = React.useRef(false);

  const applySession = React.useCallback((session: Session) => {
    emailToken.current = session.token;
    window.sessionStorage.setItem(DRAFT_SESSION_KEY, session.token);
    setError(undefined);
    if (session.ready) {
      setStage({ kind: "details", context: toSessionContext(session) });
    } else {
      setStage({ kind: "verification", emails: session.emails, session });
    }
  }, []);

  const openDraftLink = React.useCallback(
    async (token: string) => {
      setStage({ kind: "loadingDraft" });
      let outcome;
      try {
        outcome = mapVerifyDraftResult(
          await apiClient.POST("/v1/registrations/verify-link", {
            body: { token },
          }),
        );
      } catch {
        setStage({
          kind: "unreachable",
          retry: () => void openDraftLink(token),
        });
        return;
      }

      switch (outcome.kind) {
        case "ok":
          applySession(outcome.session);
          return;
        case "invalidLink":
          setStage({ kind: "invalidDraft" });
          return;
        case "identityConflict":
          setStage({ kind: "identityConflict" });
          return;
        case "rateLimited":
          setStage({
            kind: "rateLimited",
            retry: () => void openDraftLink(token),
          });
          return;
        case "failed":
          setStage({
            kind: "unreachable",
            retry: () => void openDraftLink(token),
          });
      }
    },
    [applySession],
  );

  const lookupInvitation = React.useCallback(async () => {
    const fragment = new URLSearchParams(window.location.hash.slice(1)).get(
      "token",
    );
    const token = invitationToken.current ?? readToken(fragment);
    if (!token) {
      setStage({ kind: "invalidInvitation" });
      return;
    }
    invitationToken.current = token;
    window.history.replaceState(window.history.state, "", "/convit");
    setStage({ kind: "loadingInvitation" });

    let outcome;
    try {
      outcome = mapLookupResult(
        await apiClient.POST("/v1/invitations/lookup", { body: { token } }),
      );
    } catch {
      setStage({
        kind: "unreachable",
        retry: () => void lookupInvitation(),
      });
      return;
    }
    if (outcome.kind === "ok") {
      setStage({
        kind: "details",
        context: toInvitationContext(outcome.invitation),
      });
    } else if (outcome.kind === "invalid") {
      setStage({ kind: "invalidInvitation" });
    } else if (outcome.kind === "rateLimited") {
      setStage({
        kind: "rateLimited",
        retry: () => void lookupInvitation(),
      });
    } else {
      setStage({
        kind: "unreachable",
        retry: () => void lookupInvitation(),
      });
    }
  }, []);

  const resumeDraft = React.useCallback(
    async (token: string, showLoading: boolean) => {
      if (showLoading) setStage({ kind: "loadingDraft" });
      setBusy(!showLoading);
      setError(undefined);
      try {
        const outcome = mapVerifyDraftResult(
          await apiClient.POST("/v1/registrations/resume", {
            body: { token },
          }),
        );
        setBusy(false);
        if (outcome.kind === "ok") applySession(outcome.session);
        else if (outcome.kind === "identityConflict")
          setStage({ kind: "identityConflict" });
        else if (outcome.kind === "invalidLink") {
          window.sessionStorage.removeItem(DRAFT_SESSION_KEY);
          if (showLoading) setStage({ kind: "invalidDraft" });
          else setError("la sessió ha caducat. torna a començar.");
        } else if (showLoading) {
          setStage({
            kind: "unreachable",
            retry: () => void resumeDraft(token, true),
          });
        } else setError(GENERIC_FAILURE);
      } catch {
        setBusy(false);
        if (showLoading) {
          setStage({
            kind: "unreachable",
            retry: () => void resumeDraft(token, true),
          });
        } else setError(NETWORK_FAILURE);
      }
    },
    [applySession],
  );

  React.useEffect(() => {
    if (initialised.current) return;
    initialised.current = true;
    if (invited) {
      void lookupInvitation();
      return;
    }
    const token = readToken(
      new URLSearchParams(window.location.hash.slice(1)).get("token"),
    );
    if (!token) {
      const stored = window.sessionStorage.getItem(DRAFT_SESSION_KEY);
      const storedToken = readToken(stored);
      if (storedToken) {
        void resumeDraft(storedToken, true);
        return;
      }
      setStage({ kind: "email" });
      return;
    }
    window.history.replaceState(window.history.state, "", "/formulari");
    void openDraftLink(token);
  }, [invited, lookupInvitation, openDraftLink, resumeDraft]);

  async function startVerification(values: EmailStep) {
    const { universityEmail, personalEmail } = values;
    // Only the addresses actually supplied travel to the API, and only those
    // become rows on the checklist — a draft started with one address must
    // never show a second row waiting on a link nobody was sent.
    const body = {
      ...(universityEmail ? { universityEmail } : {}),
      ...(personalEmail ? { personalEmail } : {}),
    };

    setEmails({
      universityEmail: universityEmail ?? "",
      personalEmail: personalEmail ?? "",
    });
    setError(undefined);
    setBusy(true);
    let outcome;
    try {
      outcome = mapStartResult(
        await apiClient.POST("/v1/registrations/start", { body }),
      );
    } catch {
      setBusy(false);
      setError(NETWORK_FAILURE);
      return;
    }
    setBusy(false);
    if (outcome.kind === "sent") {
      setStage({
        kind: "verification",
        emails: {
          ...(universityEmail
            ? {
                university: { maskedAddress: universityEmail, verified: false },
              }
            : {}),
          ...(personalEmail
            ? { personal: { maskedAddress: personalEmail, verified: false } }
            : {}),
        },
      });
    } else if (outcome.kind === "closed") {
      router.push("/inscripcions-tancades");
    } else if (outcome.kind === "rateLimited") {
      setError(RATE_LIMITED);
    } else if (outcome.kind === "invalid") {
      setError(unmappedMessage(outcome.issues));
    } else {
      setError(GENERIC_FAILURE);
    }
  }

  async function refreshDraft() {
    const token = emailToken.current;
    if (!token) return;
    await resumeDraft(token, false);
  }

  async function resendLink(kind: MemberEmailKind) {
    const token = emailToken.current;
    if (!token) return;
    setResending(kind);
    setError(undefined);
    try {
      await apiClient.POST("/v1/registrations/resend-link", {
        body: { token, kind },
      });
    } catch {
      setError(NETWORK_FAILURE);
    } finally {
      setResending(undefined);
    }
  }

  const submitDetails = useSubmitDetails({
    invited,
    emailToken,
    invitationToken,
    setStage,
    setBusy,
    setError,
    setFieldIssues,
  });

  return {
    invited,
    stage,
    busy,
    resending,
    error,
    fieldIssues,
    emails,
    startVerification,
    refreshDraft,
    resendLink,
    submitDetails,
    restart() {
      emailToken.current = undefined;
      window.sessionStorage.removeItem(DRAFT_SESSION_KEY);
      setError(undefined);
      setStage({ kind: "email" });
    },
  };
}
