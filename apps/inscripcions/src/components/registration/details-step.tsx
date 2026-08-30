"use client";

import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type FieldErrors } from "react-hook-form";
import { AnimatePresence, motion } from "framer-motion";
import { CircleUserRound, GraduationCap, Loader2 } from "lucide-react";

import { Button } from "@repo/ui/button";
import { Form } from "@repo/ui/form";

import NameField from "@/components/form/fields/name";
import SurnameField from "@/components/form/fields/surnames";
import DegreeField from "@/components/form/fields/degree";
import YearField from "@/components/form/fields/year";
import NoteField from "@/components/form/fields/note";
import PhoneField from "@/components/form/fields/phone";
import { ErrorSummary, Section } from "@/components/form/notices";
import { childVariants, noticeVariants } from "@/components/form/motion";
import {
  FIELD_ORDER,
  profileFormSchema,
  type ProfileForm,
} from "@/lib/form-schema";
import type { KnownMembership, KnownProfile } from "@/lib/registration-flow";

import { AlreadyAppliedNotice, KnownPersonNotice } from "./recap";

function firstInvalidField(errors: FieldErrors<ProfileForm>) {
  return FIELD_ORDER.find((field) => errors[field]);
}

/**
 * Moves focus to the field the user has to fix first.
 *
 * Every control exposes something focusable under `data-field-name` — the
 * degree combobox is a real button and the year segmented control is a real
 * radio — so the error summary is only the fallback for a collapsed note
 * field, which is not in the DOM at all when closed.
 */
function focusField(field: string | undefined) {
  const target =
    (field
      ? document.querySelector<HTMLElement>(`[data-field-name="${field}"]`)
      : null) ?? document.getElementById("form-error-summary");

  target?.focus({ preventScroll: true });
  target?.scrollIntoView({ block: "center", behavior: "smooth" });
}

function focusError(field?: string) {
  requestAnimationFrame(() => focusField(field));
}

/**
 * What changes between the two ways in. Everything else on this screen —
 * every field, every heading, the surface, the motion — is identical, which
 * is the point: an invited person and a public applicant are filling in the
 * same form, so they should be looking at the same page.
 */
export interface DetailsContext {
  email: string;
  /** Prefill, when we already hold a profile for this address. */
  profile: KnownProfile | null;
  memberships: readonly KnownMembership[];
  /** True on the invitation path: no review, no waiting. */
  invited: boolean;
  /** Campaign the invitation admits them to. Invited path only. */
  campaignLabel?: string;
  /** Their status in the open campaign, if they already applied to it. */
  openCampaignRegistrationStatus?: string | null;
}

const emptyDefaults: ProfileForm = {
  name: "",
  surnames: "",
  phone: "",
  degree: undefined as unknown as ProfileForm["degree"],
  year: 1,
  note: "",
};

export const DetailsStepForm = ({
  context,
  submitting,
  error,
  fieldIssues,
  onSubmit,
}: {
  context: DetailsContext;
  submitting: boolean;
  error?: string;
  /** Field-level complaints the API made about the last submission. */
  fieldIssues?: readonly { field: keyof ProfileForm; message: string }[];
  onSubmit: (values: ProfileForm) => void;
}) => {
  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileFormSchema),
    shouldFocusError: false,
    defaultValues: context.profile
      ? {
          name: context.profile.name,
          surnames: context.profile.surnames,
          phone: context.profile.phone,
          degree: context.profile.degree as ProfileForm["degree"],
          year: context.profile.year,
          note: "",
        }
      : emptyDefaults,
  });

  // The API is the authority on its own validation, so its complaints are
  // pushed onto the fields rather than shown as one opaque banner.
  React.useEffect(() => {
    for (const issue of fieldIssues ?? []) {
      form.setError(issue.field, { message: issue.message });
    }
  }, [fieldIssues, form]);

  React.useEffect(() => {
    if (error) form.setError("root", { message: error });
    else form.clearErrors("root");
  }, [error, form]);

  const invalidFields = FIELD_ORDER.filter(
    (field) => form.formState.errors[field],
  );
  const showErrorSummary =
    invalidFields.length > 0 || Boolean(form.formState.errors.root);

  const alreadyApplied =
    !context.invited && Boolean(context.openCampaignRegistrationStatus);

  return (
    <Form {...form}>
      <form
        noValidate
        aria-busy={submitting}
        onSubmit={form.handleSubmit(onSubmit, (errors) =>
          focusError(firstInvalidField(errors)),
        )}
      >
        <div className="space-y-4">
          {(context.memberships.length > 0 || context.profile) && (
            <KnownPersonNotice
              email={context.email}
              memberships={context.memberships}
              prefilled={Boolean(context.profile)}
              invited={context.invited}
            />
          )}

          {alreadyApplied && (
            <AlreadyAppliedNotice
              status={context.openCampaignRegistrationStatus ?? ""}
            />
          )}

          <AnimatePresence initial={false}>
            {showErrorSummary && (
              <motion.div
                key="errors"
                variants={noticeVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="overflow-hidden"
              >
                <ErrorSummary
                  fields={invalidFields}
                  errors={form.formState.errors}
                  rootMessage={form.formState.errors.root?.message}
                  onSelectField={focusField}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            variants={childVariants}
            className="divide-y overflow-hidden rounded-xl border bg-card shadow-sm"
          >
            <Section title="qui ets?" icon={CircleUserRound}>
              <NameField form={form} />
              <SurnameField form={form} />
              <div className="sm:col-span-2">
                <PhoneField form={form} />
              </div>
            </Section>

            <Section
              title="què estudies?"
              icon={GraduationCap}
              className="sm:grid-cols-1"
            >
              <DegreeField form={form} />
              <YearField form={form} />
            </Section>

            <div className="p-6 sm:p-8">
              <NoteField form={form} />
            </div>

            <div className="bg-default/60 p-6 sm:p-8">
              <motion.div whileTap={{ scale: 0.99 }}>
                <Button
                  className="h-11 w-full text-sm"
                  type="submit"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="animate-spin" />
                      {context.invited ? "entrant…" : "enviant…"}
                    </>
                  ) : context.invited ? (
                    "entra a l'equip"
                  ) : (
                    "envia la inscripció"
                  )}
                </Button>
              </motion.div>
              <p className="mt-3 text-center text-xs leading-relaxed text-muted-foreground">
                {context.invited
                  ? "com que t'hem convidat, no has d'esperar cap revisió: seràs membre en acabar."
                  : "ja hem verificat el teu correu. quan enviïs les dades, el comitè revisarà la sol·licitud i t'escriurà."}
              </p>
            </div>
          </motion.div>
        </div>
      </form>
    </Form>
  );
};
