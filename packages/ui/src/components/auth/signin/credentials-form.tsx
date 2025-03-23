"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Credentials } from "@repo/auth/validators/credentials";
import z from "zod";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

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
import { Alert, AlertDescription, AlertTitle } from "@repo/ui/alert";
import { AlertCircle } from "lucide-react";

const CredentialsForm = () => {
  const router = useRouter();

  const form = useForm<z.infer<typeof Credentials>>({
    resolver: zodResolver(Credentials),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof Credentials>) {
    const result = await signIn("credentials", {
      email: values.email,
      password: values.password,
      redirect: false,
    });

    if (result?.error) {
      form.control.setError("root", {
        message: "El correu o la contrasenya és incorrecte.",
      });
    } else if (result?.ok) {
      router.push("/");
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {form.formState.errors.root && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {form.formState.errors.root.message}
            </AlertDescription>
          </Alert>
        )}
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
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contrasenya</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full">
          Inicia sessió
        </Button>
      </form>
    </Form>
  );
};

export default CredentialsForm;
