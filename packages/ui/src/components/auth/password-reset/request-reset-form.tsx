"use client";
import React from "react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@repo/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { RequestPasswordReset } from "@repo/validators/reset-password";
import { useForm } from "react-hook-form";
import z from "zod";
import { Input } from "@repo/ui/input";
import { Card } from "@repo/ui/card";
import { Button } from "@repo/ui/button";
import Loader from "@repo/ui/loader";
import { useRouter } from "next/navigation";
import { pages } from "@repo/constants/constants/pages";

const RequestPasswordResetForm = () => {
  const router = useRouter();

  const form = useForm<z.infer<typeof RequestPasswordReset>>({
    resolver: zodResolver(RequestPasswordReset),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(values: z.infer<typeof RequestPasswordReset>) {
    console.log(values);
    router.push(pages.verify);
  }

  return (
    <Card>
      <div>
        <h1 className="text-2xl font-bold">Canvia la teva contrasenya</h1>
        <p className="text-sm text-muted-foreground mt-3">
          Lorem ipsum dolor sit amet, consectetur adipisicing elit. Laborum,
          quam corrupti asperiores ipsam assumenda animi?
        </p>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 mt-5">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>El teu correu</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="john.doe@gmail.com"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="submit"
            className="w-full"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? <Loader /> : "Canvia contrasenya"}
          </Button>
        </form>
      </Form>
    </Card>
  );
};

export default RequestPasswordResetForm;
