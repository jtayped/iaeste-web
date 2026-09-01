"use client";

import React from "react";
import { useRouter } from "next/navigation";

import { apiClient } from "@/lib/api";
import type { ProfileForm } from "@/lib/form-schema";
import { mapAcceptResult } from "@/lib/invitation-flow";
import { mapSubmitResult } from "@/lib/registration-flow";

import {
  toMappedIssues,
  toRequestProfile,
  unmappedMessage,
  type MappedFieldIssue,
} from "./context";
import type { Stage } from "./flow-types";

const DRAFT_SESSION_KEY = "iaeste-registration-draft-session";
const NETWORK_FAILURE =
  "no hem pogut connectar amb el servidor. comprova la connexió i torna-ho a provar.";
const GENERIC_FAILURE =
  "no hem pogut desar la inscripció. torna-ho a provar d'aquí a un moment.";

export function useSubmitDetails({
  invited,
  emailToken,
  invitationToken,
  setStage,
  setBusy,
  setError,
  setFieldIssues,
}: {
  invited: boolean;
  emailToken: React.RefObject<string | undefined>;
  invitationToken: React.RefObject<string | undefined>;
  setStage: React.Dispatch<React.SetStateAction<Stage>>;
  setBusy: React.Dispatch<React.SetStateAction<boolean>>;
  setError: React.Dispatch<React.SetStateAction<string | undefined>>;
  setFieldIssues: React.Dispatch<
    React.SetStateAction<readonly MappedFieldIssue[]>
  >;
}) {
  const router = useRouter();
  const accepting = React.useRef(false);

  async function submitPublic(values: ProfileForm) {
    const token = emailToken.current;
    if (!token) {
      setStage({ kind: "email" });
      setError("la sessió ha caducat. torna a començar pels correus.");
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
    if (outcome.kind === "created") {
      window.sessionStorage.removeItem(DRAFT_SESSION_KEY);
      router.push(outcome.accepted ? "/acceptat?via=renewal" : "/en-revisio");
    } else if (outcome.kind === "closed") router.push("/inscripcions-tancades");
    else if (outcome.kind === "alreadyRegistered") router.push("/ja-inscrit");
    else if (outcome.kind === "expiredSession") {
      emailToken.current = undefined;
      window.sessionStorage.removeItem(DRAFT_SESSION_KEY);
      setStage({ kind: "email" });
      setError("la sessió ha caducat. torna a confirmar els dos correus.");
    } else if (outcome.kind === "invalid") {
      setFieldIssues(toMappedIssues(outcome.issues));
      setError(unmappedMessage(outcome.issues));
    } else setError(GENERIC_FAILURE);
  }

  async function submitInvitation(values: ProfileForm) {
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
    if (outcome.kind === "accepted") {
      setStage({ kind: "accepted", alreadyMember: outcome.alreadyMember });
    } else if (outcome.kind === "invalid") {
      setStage({ kind: "invalidInvitation" });
    } else {
      accepting.current = false;
      setError(
        outcome.kind === "rateLimited"
          ? "hem rebut massa peticions. torna-ho a provar d'aquí una estona."
          : GENERIC_FAILURE,
      );
    }
  }

  return invited ? submitInvitation : submitPublic;
}
