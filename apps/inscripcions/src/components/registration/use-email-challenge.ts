"use client";

import React from "react";
import { useRouter } from "next/navigation";

import type { MemberEmailKind } from "@repo/constants/validators/member-email";

import { apiClient } from "@/lib/api";
import {
  emailStepSchema,
  type CodeStep,
  type EmailStepValues,
  type ProfileForm,
} from "@/lib/form-schema";
import {
  mapStartResult,
  mapVerifyCodeResult,
  type Session,
} from "@/lib/registration-flow";
import {
  clearPendingCode,
  clearRegistrationSession,
  readPendingCode,
  rememberPendingCode,
} from "@/lib/registration-storage";

import { unmappedMessage } from "./context";
import type { Stage } from "./flow-types";

const NETWORK_FAILURE =
  "no hem pogut connectar amb el servidor. comprova la connexió i torna-ho a provar.";
const GENERIC_FAILURE =
  "no hem pogut continuar. torna-ho a provar d'aquí a un moment.";
const RATE_LIMITED =
  "hem rebut massa peticions. torna-ho a provar d'aquí una estona.";
const BAD_CODE =
  "aquest codi no és correcte, ha caducat o ja s'ha utilitzat. demana'n un altre si et cal.";

export function useEmailChallenge({
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
}: {
  emailToken: React.RefObject<string | undefined>;
  latestSession: React.RefObject<Session | undefined>;
  applySession: (session: Session) => void;
  resumeDraft: (token: string, showLoading: boolean) => Promise<void>;
  setEmails: React.Dispatch<React.SetStateAction<EmailStepValues>>;
  setProfileDraft: React.Dispatch<
    React.SetStateAction<ProfileForm | undefined>
  >;
  setError: React.Dispatch<React.SetStateAction<string | undefined>>;
  setBusy: React.Dispatch<React.SetStateAction<boolean>>;
  setStage: React.Dispatch<React.SetStateAction<Stage>>;
  setFurthestStep: React.Dispatch<React.SetStateAction<number>>;
}) {
  const router = useRouter();
  const [resendingCode, setResendingCode] = React.useState(false);
  const [resendingLink, setResendingLink] = React.useState<MemberEmailKind>();
  const [resendIn, setResendIn] = React.useState(0);

  React.useEffect(() => {
    const pending = readPendingCode();
    if (!pending) return;
    setResendIn(
      Math.max(0, Math.ceil((pending.resendAvailableAt - Date.now()) / 1_000)),
    );
  }, []);

  React.useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setTimeout(
      () => setResendIn((seconds) => Math.max(0, seconds - 1)),
      1_000,
    );
    return () => window.clearTimeout(timer);
  }, [resendIn]);

  async function requestCode(values: EmailStepValues, isResend: boolean) {
    const parsed = emailStepSchema.safeParse(values);
    if (!parsed.success) {
      setError(
        unmappedMessage(
          parsed.error.issues.map((issue) => ({
            field: String(issue.path[0] ?? "email"),
            message: issue.message,
          })),
        ),
      );
      return;
    }
    const email = parsed.data.email;
    setEmails({ email });
    setError(undefined);
    if (isResend) setResendingCode(true);
    else setBusy(true);

    let outcome;
    try {
      outcome = mapStartResult(
        await apiClient.POST("/v1/registrations/start", { body: { email } }),
      );
    } catch {
      setBusy(false);
      setResendingCode(false);
      setError(NETWORK_FAILURE);
      return;
    }
    setBusy(false);
    setResendingCode(false);

    if (outcome.kind === "sent") {
      if (!isResend) {
        emailToken.current = undefined;
        latestSession.current = undefined;
        clearRegistrationSession();
        setProfileDraft(undefined);
        setFurthestStep(1);
      }
      const resendAvailableAt = Date.now() + outcome.resendAfterSeconds * 1_000;
      rememberPendingCode({ email, resendAvailableAt });
      setResendIn(outcome.resendAfterSeconds);
      setStage({ kind: "verification", method: "code", email });
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

  async function submitCode(email: string, values: CodeStep) {
    setError(undefined);
    setBusy(true);
    let outcome;
    try {
      outcome = mapVerifyCodeResult(
        await apiClient.POST("/v1/registrations/verify-code", {
          body: { email, code: values.code },
        }),
      );
    } catch {
      setBusy(false);
      setError(NETWORK_FAILURE);
      return;
    }
    setBusy(false);

    if (outcome.kind === "ok") {
      clearPendingCode();
      applySession(outcome.session);
    } else if (outcome.kind === "badCode") {
      setError(BAD_CODE);
    } else if (outcome.kind === "rateLimited") {
      setError(RATE_LIMITED);
    } else if (outcome.kind === "identityConflict") {
      setStage({ kind: "identityConflict" });
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
    setResendingLink(kind);
    setError(undefined);
    try {
      await apiClient.POST("/v1/registrations/resend-link", {
        body: { token, kind },
      });
    } catch {
      setError(NETWORK_FAILURE);
    } finally {
      setResendingLink(undefined);
    }
  }

  return {
    resendIn,
    resendingCode,
    resendingLink,
    startVerification: (values: EmailStepValues) => requestCode(values, false),
    resendCode: (email: string) => requestCode({ email }, true),
    submitCode,
    refreshDraft,
    resendLink,
  };
}
