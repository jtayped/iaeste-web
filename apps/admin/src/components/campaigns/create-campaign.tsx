"use client";

import * as React from "react";
import { Plus } from "lucide-react";

import { Button } from "@repo/ui/button";
import {
  Drawer,
  DrawerBody,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@repo/ui/drawer";

import { CampaignFields } from "@/components/campaigns/campaign-fields";
import { useCampaignAction } from "@/lib/campaigns";
import {
  campaignDates,
  EMPTY_CAMPAIGN_FORM,
  hasErrors,
  validateCampaignForm,
  type CampaignFormErrors,
  type CampaignFormState,
} from "@/lib/campaign-form";

/**
 * "nova campanya", in a sheet.
 *
 * A sheet rather than a dialog because the form is six fields tall: on a phone
 * a centred dialog either overflows the viewport or scrolls inside a box, and
 * the sheet is already the pattern this app uses for the mobile nav.
 *
 * A new campaign is always created as a draft. Making it current and opening
 * its registrations are separate, deliberate actions on the detail page —
 * creating a campaign should never be able to redirect the public form by
 * accident.
 */
export function CreateCampaign() {
  const [open, setOpen] = React.useState(false);
  const [state, setState] =
    React.useState<CampaignFormState>(EMPTY_CAMPAIGN_FORM);
  const [errors, setErrors] = React.useState<CampaignFormErrors>({});
  const action = useCampaignAction();

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setState(EMPTY_CAMPAIGN_FORM);
      setErrors({});
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const found = validateCampaignForm(state);
    setErrors(found);
    if (hasErrors(found)) return;

    const dates = campaignDates(state);
    if (!dates) return;

    action.mutate(
      {
        kind: "create",
        slug: state.slug.trim(),
        label: state.label.trim(),
        dates,
      },
      { onSuccess: () => handleOpenChange(false) },
    );
  }

  return (
    <Drawer isOpen={open} onOpenChange={handleOpenChange}>
      {/* The button is the trigger: React Aria hands it the trigger props
          through context, so it needs no wrapper of its own. */}
      <Button size="sm" className="w-full sm:w-auto">
        <Plus className="size-4" aria-hidden />
        nova campanya
      </Button>
      <DrawerContent className="w-full sm:max-w-lg">
        <DrawerHeader>
          <DrawerTitle>nova campanya</DrawerTitle>
          <DrawerDescription>
            es crea com a esborrany. marcar-la com a actual i obrir les
            inscripcions són accions a part.
          </DrawerDescription>
        </DrawerHeader>

        {/* The form lives in the body: that is the part React Aria leaves
            scrollable and keeps out of the drag-to-dismiss. */}
        <DrawerBody className="mt-6">
          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            <CampaignFields
              state={state}
              errors={errors}
              slugEditable
              onChange={(patch) =>
                setState((current) => ({ ...current, ...patch }))
              }
            />

            <div className="flex flex-col gap-2 sm:flex-row-reverse [&>*]:min-h-11 sm:[&>*]:min-h-9">
              <Button type="submit" disabled={action.isPending}>
                {action.isPending ? "creant…" : "crea la campanya"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                cancel·la
              </Button>
            </div>
          </form>
        </DrawerBody>
        {/* Labelled here, not in the shared component: React Aria ships no
            Catalan bundle, so its default close label falls back to English. */}
        <DrawerClose aria-label="tanca" />
      </DrawerContent>
    </Drawer>
  );
}
