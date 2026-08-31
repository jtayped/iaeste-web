"use client";

import * as React from "react";
import { Bell, BellOff, BellRing } from "lucide-react";

import { Button } from "@repo/ui/button";
import { toast } from "@repo/ui/sonner";
import { Tooltip, TooltipContent } from "@repo/ui/tooltip";

import {
  currentSubscription,
  disablePush,
  enablePush,
  isPushConfigured,
  isPushSupported,
  type PushResult,
} from "@/lib/push";

type ToggleState =
  /** Still working out whether push is available at all. Renders nothing. */
  | { kind: "checking" }
  /** No push here — unsupported browser, or no VAPID key on the server. */
  | { kind: "hidden" }
  /** The OS has blocked notifications; the browser will not prompt again. */
  | { kind: "blocked" }
  | { kind: "ready"; subscribed: boolean };

/** What each failure says out loud. The user only ever sees one of these. */
function describe(result: PushResult): string {
  switch (result.status) {
    case "denied":
      return "el navegador ha bloquejat els avisos. actives-los des dels permisos del lloc.";
    case "disabled":
      return "els avisos no estan configurats al servidor.";
    case "unsupported":
      return "aquest navegador no admet avisos push.";
    case "error":
      return result.message;
    case "ok":
      return "";
  }
}

/**
 * The "enable notifications" affordance, in the header so it is reachable from
 * every page without a settings screen to go hunting for.
 *
 * It renders nothing at all unless push can actually work: an unsupported
 * browser (every iOS tab that is not an installed PWA) or a server with no
 * VAPID key gets no dead control to wonder about. Permission is requested from
 * the click and never on mount — a prompt nobody asked for is how a site earns
 * a permanent block.
 */
export function NotificationsToggle() {
  const [state, setState] = React.useState<ToggleState>({ kind: "checking" });
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    async function check() {
      if (!isPushSupported()) {
        if (!cancelled) setState({ kind: "hidden" });
        return;
      }
      if (!(await isPushConfigured())) {
        if (!cancelled) setState({ kind: "hidden" });
        return;
      }
      if (Notification.permission === "denied") {
        if (!cancelled) setState({ kind: "blocked" });
        return;
      }

      const subscription = await currentSubscription();
      if (!cancelled) {
        setState({ kind: "ready", subscribed: subscription !== null });
      }
    }

    void check();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleClick(subscribed: boolean) {
    setPending(true);
    const result = subscribed ? await disablePush() : await enablePush();
    setPending(false);

    if (result.status === "ok") {
      setState({ kind: "ready", subscribed: result.subscribed });
      toast.success(
        result.subscribed ? "avisos activats" : "avisos desactivats",
      );
      return;
    }

    if (result.status === "denied") setState({ kind: "blocked" });
    toast.error("no s'han pogut canviar els avisos", {
      description: describe(result),
    });
  }

  if (state.kind === "checking" || state.kind === "hidden") return null;

  if (state.kind === "blocked") {
    return (
      <ToggleButton
        icon={BellOff}
        label="avisos bloquejats pel navegador"
        tooltip="el navegador ha bloquejat els avisos. actives-los des dels permisos del lloc."
        disabled
      />
    );
  }

  const { subscribed } = state;

  return (
    <ToggleButton
      icon={subscribed ? BellRing : Bell}
      active={subscribed}
      disabled={pending}
      label={subscribed ? "desactiva els avisos" : "activa els avisos"}
      tooltip={
        subscribed
          ? "reps avisos en aquest dispositiu"
          : "rep un avís quan hi hagi feina a revisar"
      }
      onClick={() => {
        void handleClick(subscribed);
      }}
    />
  );
}

function ToggleButton({
  icon: Icon,
  label,
  tooltip,
  active = false,
  disabled = false,
  onClick,
}: {
  icon: typeof Bell;
  label: string;
  tooltip: string;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <Tooltip>
      {/* The button is the trigger: React Aria hands it the trigger props
          through context, so it needs no wrapper of its own. */}
      <Button
        variant="ghost"
        size="icon"
        aria-label={label}
        aria-pressed={active}
        disabled={disabled}
        onClick={onClick}
        className="size-11 shrink-0 md:size-8"
      >
        <Icon
          className={active ? "size-4 text-primary" : "size-4"}
          aria-hidden
        />
      </Button>
      <TooltipContent placement="bottom">{tooltip}</TooltipContent>
    </Tooltip>
  );
}
