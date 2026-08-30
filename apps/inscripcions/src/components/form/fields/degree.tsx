"use client";

import * as React from "react";
import { UseFormReturn } from "react-hook-form";
import { Check, ChevronsUpDown } from "lucide-react";
import { DEGREE_SECTIONS } from "@repo/constants/studies";

import { cn } from "@repo/ui/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@repo/ui/command";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@repo/ui/form";

import type { ProfileForm } from "@/lib/form-schema";
import { FIELD_CONTROL, FIELD_HINT, FIELD_LABEL } from "../field-styles";

/**
 * Strips diacritics so "informatica" finds "informàtica" and "quimica" finds
 * "química". Reaching for the accent on a phone keyboard is exactly the
 * friction that sends people back to scrolling the whole list.
 */
function fold(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/**
 * cmdk's built-in scorer is a fuzzy matcher, which happily ranks "grau en
 * disseny digital" against "eng". Here every word typed has to appear in the
 * degree name or its campus, and a word-prefix match outranks a match in the
 * middle so "eng" puts "enginyeria" above "disseny".
 */
function scoreDegree(value: string, search: string, keywords?: string[]) {
  const terms = fold(search).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return 1;

  const words = fold([value, ...(keywords ?? [])].join(" ")).split(/\s+/);
  if (!terms.every((term) => words.some((word) => word.includes(term)))) {
    return 0;
  }

  return terms.every((term) => words.some((word) => word.startsWith(term)))
    ? 1
    : 0.5;
}

const DegreeField = ({ form }: { form: UseFormReturn<ProfileForm> }) => {
  const [open, setOpen] = React.useState(false);

  return (
    <FormField
      control={form.control}
      name="degree"
      render={({ field }) => (
        <FormItem className="flex flex-col space-y-2">
          <FormLabel className={FIELD_LABEL}>grau</FormLabel>

          <Popover open={open} onOpenChange={setOpen}>
            <FormControl>
              <PopoverTrigger
                type="button"
                role="combobox"
                aria-expanded={open}
                aria-required="true"
                data-field-name="degree"
                onBlur={field.onBlur}
                className={cn(
                  FIELD_CONTROL,
                  "flex w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 text-left text-base shadow-sm transition-colors md:text-sm",
                  "hover:border-ring/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                  "aria-[invalid=true]:border-destructive",
                  !field.value && "text-muted-foreground",
                )}
              >
                <span className="truncate">
                  {field.value ?? "cerca o tria el teu grau"}
                </span>
                <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
              </PopoverTrigger>
            </FormControl>

            <PopoverContent
              align="start"
              className="w-[--radix-popover-trigger-width] p-0"
            >
              <Command filter={scoreDegree}>
                <CommandInput placeholder="escriu per filtrar…" />
                <CommandList>
                  <CommandEmpty className={cn(FIELD_HINT, "px-4 py-6")}>
                    cap grau coincideix. tria «altre» i explica-ho a la nota.
                  </CommandEmpty>

                  {DEGREE_SECTIONS.map((section) => (
                    <CommandGroup
                      key={section.section}
                      heading={section.section}
                    >
                      {section.degrees.map(({ label, campus }) => (
                        <CommandItem
                          key={label}
                          value={label}
                          keywords={campus ? [campus] : undefined}
                          onSelect={() => {
                            field.onChange(label);
                            setOpen(false);
                          }}
                          className="gap-2 py-2"
                        >
                          <Check
                            className={cn(
                              "size-4 shrink-0 text-primary",
                              field.value === label
                                ? "opacity-100"
                                : "opacity-0",
                            )}
                          />
                          {/* Wraps rather than truncates: on a phone the
                              longest double degrees would otherwise be cut
                              exactly where they stop being distinguishable. */}
                          <span className="min-w-0 flex-1">{label}</span>
                          {campus && (
                            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                              {campus.toLowerCase()}
                            </span>
                          )}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  ))}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          <FormMessage className={cn(FIELD_HINT, "font-medium")} />
        </FormItem>
      )}
    />
  );
};

export default DegreeField;
