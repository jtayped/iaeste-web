"use client";

import React from "react";
import { motion } from "framer-motion";
import { History, MailCheck } from "lucide-react";
import { cn } from "@repo/ui/lib/utils";

import { FIELD_HINT, SECTION_HEADING } from "@/components/form/field-styles";
import { childVariants } from "@/components/form/motion";
import type { KnownMembership } from "@/lib/registration-flow";

/**
 * How a past membership reads to the person who lived it.
 *
 * `kicked` is deliberately not spelled out. This is a public page the person
 * reached by proving an address, not a committee record, and "we removed you"
 * is not a sentence to deliver in a form's sidebar — the committee owns that
 * conversation. Both endings say the membership finished; the admin timeline
 * keeps the distinction that matters internally.
 */
const MEMBERSHIP_LABELS: Record<KnownMembership["status"], string> = {
  active: "membre actiu",
  left: "vas ser-hi",
  kicked: "vas ser-hi",
};

/**
 * The "we already know you" panel.
 *
 * Shown once the address is proven — after the code on the public path, on
 * arrival on the invited one. Its job is to explain why the fields below
 * arrived filled in, which is otherwise unsettling on a public form, and to
 * make clear that everything is still editable.
 */
export const KnownPersonNotice = ({
  email,
  memberships,
  prefilled,
  invited,
}: {
  email: string;
  memberships: readonly KnownMembership[];
  prefilled: boolean;
  /** Changes only how the address got here — proven by a code, or by a token. */
  invited: boolean;
}) => (
  <motion.div
    variants={childVariants}
    className="rounded-xl border bg-card p-6 shadow-sm sm:p-8"
  >
    <div className="flex items-center gap-2.5">
      <MailCheck aria-hidden="true" className="size-4 shrink-0 text-primary" />
      <h2 className={SECTION_HEADING}>ja et coneixem</h2>
    </div>

    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
      {invited ? "t'hem enviat la invitació a " : "hem verificat "}
      <span className="font-medium text-foreground">{email}</span>
      {prefilled
        ? " i hem omplert les dades que ja teníem. revisa-les i canvia el que calgui abans d'enviar-les."
        : "."}
    </p>

    {memberships.length > 0 && (
      <div className="mt-5">
        <div className="flex items-center gap-2 text-muted-foreground">
          <History aria-hidden="true" className="size-3.5 shrink-0" />
          <p className={cn(FIELD_HINT, "font-medium tracking-wide uppercase")}>
            el teu pas per iaeste
          </p>
        </div>
        <ul className="mt-2.5 space-y-1.5">
          {memberships.map((membership) => (
            <li
              key={`${membership.campaignLabel}-${membership.status}`}
              className="flex items-center justify-between gap-3 rounded-md bg-default/50 px-3 py-2 text-sm"
            >
              <span className="font-medium tabular-nums">
                {membership.campaignLabel}
              </span>
              <span className="text-xs text-muted-foreground">
                {MEMBERSHIP_LABELS[membership.status]}
              </span>
            </li>
          ))}
        </ul>
      </div>
    )}
  </motion.div>
);

/**
 * Shown when this address already has a registration in the campaign that is
 * open. Not a wall — the API's `ALREADY_REGISTERED` is still the only thing
 * that decides — but there is no point letting someone refill a form that
 * cannot be submitted twice.
 */
export const AlreadyAppliedNotice = ({ status }: { status: string }) => (
  <motion.div
    variants={childVariants}
    className="rounded-md border border-amber-500/30 bg-amber-50/60 px-4 py-3 text-sm text-amber-900"
  >
    {status === "accepted"
      ? "aquest correu ja és membre d'aquesta edició. no cal que t'inscriguis de nou."
      : status === "rejected"
        ? "ja vam revisar una sol·licitud d'aquest correu per a aquesta edició. si creus que hi ha un error, escriu-nos a iaeste@udl.cat."
        : "aquest correu ja té una sol·licitud en aquesta edició i el comitè l'està revisant. no cal que la tornis a enviar."}
  </motion.div>
);
