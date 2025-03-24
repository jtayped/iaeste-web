"use client";
import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import z from "zod";
import RequestSchema from "@repo/validators/request";
import { Button } from "@repo/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@repo/ui/form";
import { Input } from "@repo/ui/input";
import { Card } from "@repo/ui/card";
import Loader from "@repo/ui/loader";
import { useRouter } from "next/navigation";
import { pages } from "@repo/constants/constants/pages";

const RequestCreateForm = () => {
  const router = useRouter();

  const form = useForm<z.infer<typeof RequestSchema>>({
    resolver: zodResolver(RequestSchema),
    defaultValues: {
      name: "",
      email: "",
      comment: "",
    },
  });

  function onSubmit(values: z.infer<typeof RequestSchema>) {
    console.log(values);
    router.push(pages.requestPending);
  }

  return (
    <Card>
      <div>
        <h1 className="text-2xl font-bold">Uneix-te al nostre equip!</h1>
        <p className="text-sm text-muted-foreground mt-3">
          Per unir-te a IAESTE Lleida és molt fàcil! Simplement dona&apos;ns el
          teu nom i el teu correu electrònic i en mirarem la teva inscripció.
        </p>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 mt-5">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nom</FormLabel>
                <FormControl>
                  <Input placeholder="John Doe" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Correu</FormLabel>
                <FormControl>
                  <Input placeholder="john.doe@gmail.com" {...field} />
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
            {form.formState.isSubmitting ? <Loader /> : "Registra't"}
          </Button>
        </form>
      </Form>
    </Card>
  );
};

export default RequestCreateForm;
