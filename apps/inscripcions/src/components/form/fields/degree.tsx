"use client";

import * as React from "react";
import { UseFormReturn } from "react-hook-form";
import type { RegistrationForm } from "@/lib/form-schema";
import { DEGREE_OPTIONS } from "@repo/constants/studies";
import { DegreeOption } from "@repo/constants/types/studies";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/select";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@repo/ui/form";

const DegreeField = ({ form }: { form: UseFormReturn<RegistrationForm> }) => {
  return (
    <div className="w-full">
      <FormField
        control={form.control}
        name="degree"
        render={({ field }) => (
          <FormItem>
            <FormLabel>grau</FormLabel>
            <FormControl>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger
                  className="h-11 w-full"
                  data-field-name="degree"
                  aria-required="true"
                >
                  <SelectValue placeholder="selecciona el teu grau" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px] max-w-[300px]">
                  {DEGREE_OPTIONS.map((opt: DegreeOption) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};

export default DegreeField;
