"use client";

import React from "react";

import { apiClient } from "@/lib/api";
import type { EmailStepValues, ProfileForm } from "@/lib/form-schema";
import { mapLookupResult } from "@/lib/invitation-flow";
import {
  mapVerifyDraftResult,
  readToken,
  type Session,
} from "@/lib/registration-flow";
import {
  clearPendingCode,
  clearRegistrationSession,
  hasCompletedMembershipStep,
  readPendingCode,
  readDraftSession,
  rememberDraftSession,
} from "@/lib/registration-storage";

import {
  toInvitationContext,
  toSessionContext,
  type MappedFieldIssue,
} from "./context";
import { EMPTY_EMAIL, type Mode, type Stage } from "./flow-types";
import { useEmailChallenge } from "./use-email-challenge";
import { useFlowNavigation } from "./use-flow-navigation";
import { useSubmitDetails } from "./use-submit-details";
export type { Mode, Stage } from "./flow-types";

const NETWORK_FAILURE =
  "no hem pogut connectar amb el servidor. comprova la connexió i torna-ho a provar.";
const GENERIC_FAILURE =
  "no hem pogut desar la inscripció. torna-ho a provar d'aquí a un moment.";

export function useRegistrationFlow(mode: Mode) {
  const invited = mode.kind === "invitation";
  const [stage, setStage] = React.useState<Stage>(
    invited ? { kind: "loadingInvitation" } : { kind: "loadingDraft" },
  );
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string>();
  const [fieldIssues, setFieldIssues] = React.useState<
    readonly MappedFieldIssue[]
  >([]);
  const [emails, setEmails] = React.useState<EmailStepValues>(EMPTY_EMAIL);
  const [profileDraft, setProfileDraft] = React.useState<ProfileForm>();
  const [furthestStep, setFurthestStep] = React.useState(invited ? 1 : 0);

  const emailToken = React.useRef<string | undefined>(undefined);
  const invitationToken = React.useRef<string | undefined>(undefined);
  const latestSession = React.useRef<Session | undefined>(undefined);
  const initialised = React.useRef(false);

  const applySession = React.useCallback((session: Session) => {
    if (latestSession.current?.token !== session.token) {
      setProfileDraft(undefined);
    }
    emailToken.current = session.token;
    latestSession.current = session;
    clearPendingCode();
    rememberDraftSession(session.token);
    setError(undefined);
    if (session.ready) {
      if (hasCompletedMembershipStep(session.token)) {
        setFurthestStep(3);
        setStage({
          kind: "details",
          context: toSessionContext(session),
          session,
        });
      } else {
        setFurthestStep((current) => Math.max(current, 2));
        setStage({ kind: "membership", session });
      }
    } else {
      setFurthestStep((current) => Math.max(current, 1));
      setStage({
        kind: "verification",
        method: "link",
        emails: session.emails,
        session,
      });
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
          clearRegistrationSession();
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
      const stored = readDraftSession();
      const storedToken = readToken(stored);
      if (storedToken) {
        void resumeDraft(storedToken, true);
        return;
      }
      const pending = readPendingCode();
      if (pending) {
        setEmails({ email: pending.email });
        setFurthestStep(1);
        setStage({
          kind: "verification",
          method: "code",
          email: pending.email,
        });
        return;
      }
      setStage({ kind: "email" });
      return;
    }
    window.history.replaceState(window.history.state, "", "/formulari");
    void openDraftLink(token);
  }, [invited, lookupInvitation, openDraftLink, resumeDraft]);

  const emailChallenge = useEmailChallenge({
    emailToken,
    latestSession,
    applySession,
    resumeDraft,
    setEmails,
    setProfileDraft,
    setError,
    setBusy,
    setStage,
    setFurthestStep,
  });

  const navigation = useFlowNavigation({
    invited,
    stage,
    emails,
    emailToken,
    latestSession,
    setStage,
    setError,
    setFieldIssues,
    setProfileDraft,
    setFurthestStep,
  });

  const submitDetails = useSubmitDetails({
    invited,
    emailToken,
    invitationToken,
    setStage,
    setBusy,
    setError,
    setFieldIssues,
    onSessionExpired: navigation.restart,
  });

  const saveProfileDraft = React.useCallback((values: ProfileForm) => {
    setProfileDraft(values);
  }, []);

  return {
    invited,
    stage,
    busy,
    resendIn: emailChallenge.resendIn,
    resendingCode: emailChallenge.resendingCode,
    resendingLink: emailChallenge.resendingLink,
    error,
    fieldIssues,
    emails,
    profileDraft,
    furthestStep,
    startVerification: emailChallenge.startVerification,
    submitCode: emailChallenge.submitCode,
    resendCode: emailChallenge.resendCode,
    refreshDraft: emailChallenge.refreshDraft,
    resendLink: emailChallenge.resendLink,
    submitDetails,
    ...navigation,
    saveProfileDraft,
  };
}
