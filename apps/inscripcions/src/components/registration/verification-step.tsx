"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Check,
  Clock3,
  Loader2,
  MailCheck,
  RefreshCw,
  RotateCw,
} from "lucide-react";

import type { MemberEmailKind } from "@repo/constants/validators/member-email";
import { Button } from "@repo/ui/button";
import { cn } from "@repo/ui/lib/utils";

import { childVariants } from "@/components/form/motion";

/**
 * Only the addresses the draft was actually started with. A draft begun with
 * one address has one key here — never a placeholder row waiting on a link
 * that was never sent.
 */
export type VerificationEmails = Partial<
  Record<MemberEmailKind, { maskedAddress: string; verified: boolean }>
>;

const KINDS = ["university", "personal"] as const;

const labels: Record<MemberEmailKind, string> = {
  university: "correu universitari",
  personal: "correu personal",
};

/**
 * The wait between sending the links and having them opened.
 *
 * Every string here comes in a singular and a plural, because the same screen
 * now serves one address and two, and "obre els dos enllaços" in front of a
 * single row is the kind of copy that makes people go looking for a second
 * email that does not exist.
 *
 * The rows themselves stay a full-bleed list rather than becoming cards inside
 * the card: at one row a band reads as the address under review, and at two it
 * reads as a list, whereas an inset card at either count reads as a box inside
 * a box. Progress is carried by tinting a confirmed row instead, which is
 * legible at a glance on the way back from an inbox.
 */
export const VerificationStep = ({
  emails,
  canRefresh,
  busy,
  resending,
  error,
  onRefresh,
  onResend,
  onRestart,
}: {
  emails: VerificationEmails;
  canRefresh: boolean;
  busy: boolean;
  resending?: MemberEmailKind;
  error?: string;
  onRefresh: () => void;
  onResend: (kind: MemberEmailKind) => void;
  onRestart: () => void;
}) => {
  const entries = KINDS.flatMap((kind) => {
    const item = emails[kind];
    return item ? [{ kind, ...item }] : [];
  });
  const single = entries.length < 2;
  const pending = entries.filter((entry) => !entry.verified).length;

  return (
    <motion.div
      variants={childVariants}
      className="overflow-hidden rounded-xl border bg-card shadow-sm"
    >
      <div className="p-6 sm:p-8">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <MailCheck aria-hidden className="size-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold tracking-tight">
              {single
                ? "obre l'enllaç que t'hem enviat"
                : "obre els dos enllaços"}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {single
                ? "l'enllaç caduca d'aquí a set dies."
                : "cada correu confirma una adreça diferent. els enllaços caduquen en set dies."}
            </p>
          </div>
        </div>
      </div>

      <div className="divide-y border-y">
        {entries.map((item) => (
          <div
            key={item.kind}
            className={cn(
              "flex min-w-0 items-center gap-3 px-6 py-4 transition-colors sm:px-8",
              item.verified && "bg-primary/5",
            )}
          >
            <span
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-full",
                item.verified
                  ? "bg-primary/10 text-primary"
                  : "bg-default text-muted-foreground",
              )}
            >
              {item.verified ? (
                <Check aria-hidden className="size-4" />
              ) : (
                <Clock3 aria-hidden className="size-4" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{labels[item.kind]}</p>
              <p className="text-xs leading-relaxed break-all text-muted-foreground">
                {item.maskedAddress}
              </p>
            </div>
            <div className="shrink-0 text-xs font-medium">
              {item.verified ? (
                <span className="text-primary">confirmat</span>
              ) : canRefresh ? (
                <button
                  type="button"
                  disabled={Boolean(resending)}
                  onClick={() => onResend(item.kind)}
                  className="inline-flex items-center gap-1 text-primary underline underline-offset-4 disabled:text-muted-foreground"
                >
                  {resending === item.kind ? (
                    <Loader2 aria-hidden className="size-3 animate-spin" />
                  ) : (
                    <RotateCw aria-hidden className="size-3" />
                  )}
                  reenvia
                </button>
              ) : (
                <span className="text-muted-foreground">pendent</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-3 bg-default/60 p-6 sm:p-8">
        {error ? (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        ) : null}
        {canRefresh ? (
          <Button className="h-11 w-full" disabled={busy} onClick={onRefresh}>
            {busy ? (
              <Loader2 aria-hidden className="animate-spin" />
            ) : (
              <RefreshCw aria-hidden />
            )}
            {busy
              ? "comprovant…"
              : pending === 1
                ? "ja l'he confirmat"
                : "ja els he confirmat"}
          </Button>
        ) : (
          <p className="text-center text-sm text-muted-foreground">
            {single
              ? "obre el correu per reprendre la inscripció."
              : "obre qualsevol dels dos correus per reprendre la inscripció."}
          </p>
        )}
        <button
          type="button"
          onClick={onRestart}
          className="mx-auto block text-xs font-medium text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
        >
          {single
            ? "l'adreça no és correcta? torna a començar"
            : "les adreces no són correctes? torna a començar"}
        </button>
      </div>
    </motion.div>
  );
};
