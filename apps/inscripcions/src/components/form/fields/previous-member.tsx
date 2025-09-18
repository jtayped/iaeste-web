import { User } from "@repo/constants/validators/user";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@repo/ui/form";
import React from "react";
import { UseFormReturn } from "react-hook-form";
import { Switch } from "@repo/ui/switch";
import { Card } from "@repo/ui/card";

const PreviousMemberField = ({ form }: { form: UseFormReturn<User> }) => {
  return (
    <FormField
      control={form.control}
      name="previousMember"
      render={({ field }) => (
        <Card>
          <FormItem className="flex flex-row items-center justify-between">
            <div className="space-y-0.5">
              <FormLabel>Ets membre de IAESTE?</FormLabel>
              <FormDescription>
                Has format part del nostre equip el curs passat?
              </FormDescription>
            </div>
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
          </FormItem>
        </Card>
      )}
    />
  );
};

export default PreviousMemberField;
