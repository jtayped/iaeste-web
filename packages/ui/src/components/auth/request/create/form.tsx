"use client";
import React, { useState } from "react";
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
import { Textarea } from "@repo/ui/textarea";
import { Checkbox } from "@repo/ui/checkbox";

const RequestCreateForm = () => {
  const [showCommentField, setShowCommentField] = useState<boolean>(false);
  const router = useRouter();

  const form = useForm<z.infer<typeof RequestSchema>>({
    resolver: zodResolver(RequestSchema),
    defaultValues: {
      name: "",
      email: "",
      comment: undefined,
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
          <div className="space-y-3">
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={showCommentField}
                  onCheckedChange={(checked) => {
                    setShowCommentField(!!checked);
                    // Reset comment field when unchecked
                    if (!checked) {
                      form.setValue("comment", undefined);
                    }
                  }}
                />
              </FormControl>
              <FormLabel className="ml-2">
                Vols afegir un comentari addicional?
              </FormLabel>
            </FormItem>
            {showCommentField && (
              <FormField
                control={form.control}
                name="comment"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        rows={5}
                        placeholder="Escriu aquí el teu comentari addicional"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
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
