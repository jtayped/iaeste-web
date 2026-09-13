"use client";

import * as React from "react";

import {
  broadcastContentSchema,
  BROADCAST_PLACEHOLDERS,
} from "@repo/constants/validators/broadcast";

import type { BroadcastContent } from "@/lib/admin-types";

/**
 * The composer's draft, and the one place it is checked.
 *
 * Validation is `broadcastContentSchema` itself rather than a second set of
 * rules written here: the API re-validates with the same schema, so anything
 * this form accepts the route accepts, and every message the operator reads is
 * the schema's own lowercase Catalan. The length caps are additionally applied
 * as `maxLength` on the controls, so the one rule in that schema without a
 * Catalan message (the optional heading's cap) can never be reached.
 */

export type BroadcastField =
  "subject" | "heading" | "body" | "ctaLabel" | "ctaHref";

export interface BroadcastDraftFields {
  subject: string;
  heading: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
}

const EMPTY: BroadcastDraftFields = {
  subject: "",
  heading: "",
  body: "",
  ctaLabel: "",
  ctaHref: "",
};

/** `{{nom}}, {{cognoms}}, {{correu}}` — the hint the composer shows. */
export const PLACEHOLDER_HINTS = BROADCAST_PLACEHOLDERS.map(
  (name) => `{{${name}}}`,
);

/**
 * The wire shape for the current fields.
 *
 * The call to action is included as soon as *either* half is filled, so a
 * label with no link is a visible validation error rather than a button that
 * silently never ships.
 */
export function draftContent(fields: BroadcastDraftFields): BroadcastContent {
  const heading = fields.heading.trim();
  const label = fields.ctaLabel.trim();
  const href = fields.ctaHref.trim();

  return {
    subject: fields.subject.trim(),
    ...(heading ? { heading } : {}),
    body: fields.body.trim(),
    ...(label || href ? { callToAction: { label, href } } : {}),
  };
}

function fieldForPath(
  path: readonly PropertyKey[],
): BroadcastField | undefined {
  const [head, next] = path;
  if (head === "subject") return "subject";
  if (head === "heading") return "heading";
  if (head === "body") return "body";
  if (head === "callToAction") return next === "label" ? "ctaLabel" : "ctaHref";
  return undefined;
}

export type BroadcastErrors = Partial<Record<BroadcastField, string>>;

/** First message per field, so one mistake is not reported four times. */
export function validateDraft(content: BroadcastContent): BroadcastErrors {
  const result = broadcastContentSchema.safeParse(content);
  if (result.success) return {};

  const errors: BroadcastErrors = {};
  for (const issue of result.error.issues) {
    const field = fieldForPath(issue.path);
    if (field && errors[field] === undefined) errors[field] = issue.message;
  }
  return errors;
}

export interface BroadcastDraft {
  fields: BroadcastDraftFields;
  content: BroadcastContent;
  errors: BroadcastErrors;
  /** Errors for fields the operator has left, plus everything after a submit. */
  visibleErrors: BroadcastErrors;
  isValid: boolean;
  setField: (field: BroadcastField, value: string) => void;
  touch: (field: BroadcastField) => void;
  /** Reveals every error at once — what "continua" calls when it cannot. */
  touchAll: () => void;
  reset: () => void;
}

const FIELD_KEYS: Record<BroadcastField, keyof BroadcastDraftFields> = {
  subject: "subject",
  heading: "heading",
  body: "body",
  ctaLabel: "ctaLabel",
  ctaHref: "ctaHref",
};

export function useBroadcastDraft(): BroadcastDraft {
  const [fields, setFields] = React.useState<BroadcastDraftFields>(EMPTY);
  const [touched, setTouched] = React.useState<ReadonlySet<BroadcastField>>(
    () => new Set(),
  );
  const [showAll, setShowAll] = React.useState(false);

  const content = React.useMemo(() => draftContent(fields), [fields]);
  const errors = React.useMemo(() => validateDraft(content), [content]);

  const visibleErrors = React.useMemo<BroadcastErrors>(() => {
    if (showAll) return errors;
    const visible: BroadcastErrors = {};
    for (const [field, message] of Object.entries(errors)) {
      if (touched.has(field as BroadcastField)) {
        visible[field as BroadcastField] = message;
      }
    }
    return visible;
  }, [errors, showAll, touched]);

  const setField = React.useCallback((field: BroadcastField, value: string) => {
    setFields((current) => ({ ...current, [FIELD_KEYS[field]]: value }));
  }, []);

  const touch = React.useCallback((field: BroadcastField) => {
    setTouched((current) =>
      current.has(field) ? current : new Set(current).add(field),
    );
  }, []);

  const touchAll = React.useCallback(() => setShowAll(true), []);

  const reset = React.useCallback(() => {
    setFields(EMPTY);
    setTouched(new Set());
    setShowAll(false);
  }, []);

  return {
    fields,
    content,
    errors,
    visibleErrors,
    isValid: Object.keys(errors).length === 0,
    setField,
    touch,
    touchAll,
    reset,
  };
}
