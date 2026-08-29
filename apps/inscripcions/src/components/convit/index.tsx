"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

import { ConvitForm } from "@/components/convit/form";
import {
  AcceptedScreen,
  FailedScreen,
  InvalidScreen,
  LoadingScreen,
  RateLimitedScreen,
} from "@/components/convit/screens";
import { apiClient } from "@/lib/api";
import {
  mapAcceptResult,
  mapLookupResult,
  type Invitation,
} from "@/lib/invitation-flow";
import type { InvitationForm } from "@/lib/invitation-schema";
import { readToken } from "@/lib/registration-flow";

type Stage =
  | { kind: "loading" }
  | { kind: "form"; invitation: Invitation }
  | { kind: "accepted"; alreadyMember: boolean }
  | { kind: "invalid" }
  | { kind: "rateLimited" }
  | { kind: "failed" };

/**
 * The target of the link in the invitation email: `/convit#token=…`.
 *
 * The token rides in the fragment, exactly as `/verificar` does, because
 * browsers do not send a fragment to the server, to a proxy, or to analytics.
 * It is read once and then stripped from the address bar, so a screenshot or a
 * shared URL cannot hand someone else the committee.
 */
const Convit = () => {
  const [stage, setStage] = useState<Stage>({ kind: "loading" });
  const [submitError, setSubmitError] = useState<string | undefined>();
  // The ref is the guard (it is read synchronously, before React re-renders);
  // this is only what the button reads to show its pending label.
  const [submitting, setSubmitting] = useState(false);

  const tokenRef = useRef<string | undefined>(undefined);
  const looked = useRef(false);
  // Accepting is single use. Without this, a double-click or a remount fires
  // the request twice and the second answer — a token that has just been
  // consumed — would drop a successful new member onto the invalid screen.
  const accepting = useRef(false);

  const lookup = useCallback(async () => {
    const fragment = new URLSearchParams(window.location.hash.slice(1)).get(
      "token",
    );
    const token = tokenRef.current ?? readToken(fragment);

    if (!token) {
      setStage({ kind: "invalid" });
      return;
    }

    if (!tokenRef.current) {
      tokenRef.current = token;
      window.history.replaceState(window.history.state, "", "/convit");
    }

    setStage({ kind: "loading" });

    let outcome;
    try {
      outcome = mapLookupResult(
        await apiClient.POST("/v1/invitations/lookup", { body: { token } }),
      );
    } catch {
      setStage({ kind: "failed" });
      return;
    }

    switch (outcome.kind) {
      case "ok":
        setStage({ kind: "form", invitation: outcome.invitation });
        return;
      case "invalid":
        setStage({ kind: "invalid" });
        return;
      case "rateLimited":
        setStage({ kind: "rateLimited" });
        return;
      case "failed":
        setStage({ kind: "failed" });
    }
  }, []);

  useEffect(() => {
    if (looked.current) return;
    looked.current = true;
    void lookup();
  }, [lookup]);

  const submit = useCallback(async (values: InvitationForm) => {
    const token = tokenRef.current;
    if (!token || accepting.current) return;

    accepting.current = true;
    setSubmitting(true);
    setSubmitError(undefined);

    let outcome;
    try {
      outcome = mapAcceptResult(
        await apiClient.POST("/v1/invitations/accept", {
          body: {
            token,
            name: values.name,
            surnames: values.surnames,
            phone: values.phone,
            degree: values.degree,
            year: values.year,
          },
        }),
      );
    } catch {
      accepting.current = false;
      setSubmitting(false);
      setSubmitError(
        "no hem pogut connectar amb el servidor. comprova la connexió i torna-ho a provar.",
      );
      return;
    }

    switch (outcome.kind) {
      case "accepted":
        // The guard is deliberately not released: the token is spent.
        setStage({ kind: "accepted", alreadyMember: outcome.alreadyMember });
        return;
      case "invalid":
        setStage({ kind: "invalid" });
        return;
      case "rateLimited":
        // Retryable, so the form stays and the guard comes back off.
        accepting.current = false;
        setSubmitting(false);
        setSubmitError(
          "hem rebut massa peticions. torna-ho a provar d'aquí una estona.",
        );
        return;
      case "failed":
        accepting.current = false;
        setSubmitting(false);
        setSubmitError(
          "no hem pogut desar les dades. torna-ho a provar d'aquí a un moment.",
        );
    }
  }, []);

  switch (stage.kind) {
    case "loading":
      return <LoadingScreen />;
    case "invalid":
      return <InvalidScreen />;
    case "rateLimited":
      return <RateLimitedScreen onRetry={() => void lookup()} />;
    case "failed":
      return <FailedScreen onRetry={() => void lookup()} />;
    case "accepted":
      return <AcceptedScreen alreadyMember={stage.alreadyMember} />;
    case "form":
      return (
        <ConvitForm
          invitation={stage.invitation}
          submitting={submitting}
          {...(submitError ? { error: submitError } : {})}
          onSubmit={(values) => void submit(values)}
        />
      );
  }
};

export default Convit;
