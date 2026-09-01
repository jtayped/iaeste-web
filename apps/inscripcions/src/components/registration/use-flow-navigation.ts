"use client";

import React from "react";
import { useRouter } from "next/navigation";

import type { EmailStepValues, ProfileForm } from "@/lib/form-schema";
import type { Session } from "@/lib/registration-flow";
import {
  clearRegistrationSession,
  hasCompletedMembershipStep,
  rememberMembershipStep,
} from "@/lib/registration-storage";

import { toSessionContext, type MappedFieldIssue } from "./context";
import type { Stage } from "./flow-types";

export function useFlowNavigation({
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
}: {
  invited: boolean;
  stage: Stage;
  emails: EmailStepValues;
  emailToken: React.RefObject<string | undefined>;
  latestSession: React.RefObject<Session | undefined>;
  setStage: React.Dispatch<React.SetStateAction<Stage>>;
  setError: React.Dispatch<React.SetStateAction<string | undefined>>;
  setFieldIssues: React.Dispatch<
    React.SetStateAction<readonly MappedFieldIssue[]>
  >;
  setProfileDraft: React.Dispatch<
    React.SetStateAction<ProfileForm | undefined>
  >;
  setFurthestStep: React.Dispatch<React.SetStateAction<number>>;
}) {
  const router = useRouter();

  function restart() {
    emailToken.current = undefined;
    latestSession.current = undefined;
    clearRegistrationSession();
    setFurthestStep(0);
    setError(undefined);
    setFieldIssues([]);
    setProfileDraft(undefined);
    setStage({ kind: "email" });
  }

  function showEmail() {
    setError(undefined);
    setStage({ kind: "email" });
  }

  function completeMembershipStep() {
    if (stage.kind !== "membership") return;
    rememberMembershipStep(stage.session.token);
    setFurthestStep(3);
    setStage({
      kind: "details",
      context: toSessionContext(stage.session),
      session: stage.session,
    });
  }

  function showVerification(session: Session) {
    setError(undefined);
    setStage({
      kind: "verification",
      method: session.ready ? "complete" : "link",
      emails: session.emails,
      session,
    });
  }

  function goToStep(key: string) {
    if (invited || key === stage.kind) return;
    if (key === "email") {
      showEmail();
      return;
    }

    const session = latestSession.current;
    if (key === "verification") {
      if (session) showVerification(session);
      else if (emails.email) {
        setError(undefined);
        setStage({
          kind: "verification",
          method: "code",
          email: emails.email,
        });
      }
    } else if (key === "membership" && session?.ready) {
      setStage({ kind: "membership", session });
    } else if (
      key === "details" &&
      session?.ready &&
      hasCompletedMembershipStep(session.token)
    ) {
      setStage({
        kind: "details",
        context: toSessionContext(session),
        session,
      });
    }
  }

  function goBack() {
    if (stage.kind === "email" || (invited && stage.kind === "details")) {
      router.push("/");
    } else if (stage.kind === "verification") {
      showEmail();
    } else if (stage.kind === "membership") {
      showVerification(stage.session);
    } else if (stage.kind === "details" && stage.session) {
      setStage({ kind: "membership", session: stage.session });
    }
  }

  return {
    restart,
    showEmail,
    completeMembershipStep,
    goToStep,
    goBack,
  };
}
