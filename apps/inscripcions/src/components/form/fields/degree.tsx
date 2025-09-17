"use client";

import * as React from "react";
import { UseFormReturn } from "react-hook-form";
import { User } from "@/schemas/user";
import { DEGREE_OPTIONS } from "@/constants/studies";
import { DegreeOption } from "@/types/studies";

import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@repo/ui/lib/utils";
import { Button } from "@repo/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@repo/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/popover";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@repo/ui/form";

const DegreeField = ({ form }: { form: UseFormReturn<User> }) => {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="w-full">
      <FormField
        control={form.control}
        name="degree"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Grau</FormLabel>
            <FormControl>
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button
                    id="degree-field"
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between"
                  >
                    <span
                      className="block max-w-[220px] truncate"
                      title={field.value || "Selecciona el teu grau"}
                    >
                      {field.value
                        ? DEGREE_OPTIONS.find(
                            (opt: DegreeOption) => opt === field.value
                          )
                        : "Selecciona el teu grau"}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0" side="bottom">
                  <Command>
                    <CommandInput placeholder="Search degree..." />
                    <CommandEmpty>No s&apos;ha trobat cap grau.</CommandEmpty>
                    <CommandGroup>
                      {DEGREE_OPTIONS.map((opt: DegreeOption) => (
                        <CommandItem
                          key={opt}
                          value={opt}
                          onSelect={() => {
                            field.onChange(opt);
                            setOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              field.value === opt ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {opt}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};

export default DegreeField;
