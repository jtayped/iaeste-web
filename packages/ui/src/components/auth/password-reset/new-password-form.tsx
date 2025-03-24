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
import { ResetPassword } from "@repo/validators/reset-password";
import { useForm } from "react-hook-form";
import z from "zod";
import { Input } from "@repo/ui/input";
import { Card } from "@repo/ui/card";
import { Button } from "@repo/ui/button";
import Loader from "@repo/ui/loader";
import { useRouter } from "next/navigation";

const NewPasswordForm = ({ token }: { token: string }) => {
  const router = useRouter();

  const form = useForm<z.infer<typeof ResetPassword>>({
    resolver: zodResolver(ResetPassword),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: z.infer<typeof ResetPassword>) {
    console.log(values);
    console.log(token);
    router.push("/");
  }

  return (
    <Card>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nova contrasenya</FormLabel>
                <FormControl>
                  <Input type="password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirma contrasenya</FormLabel>
                <FormControl>
                  <Input type="password" {...field} />
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
            {form.formState.isSubmitting ? <Loader /> : "Canvia la contrasenya"}
          </Button>
        </form>
      </Form>
    </Card>
  );
};

export default NewPasswordForm;
