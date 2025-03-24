import { z } from "zod";

export const RequestPasswordReset = z.object({
  email: z.string().email(),
});

export const ResetPassword = z
  .object({
    password: z
      .string()
      .min(5, { message: "Password must be at least 5 characters" })
      .max(100, { message: "Password must be at most 100 characters" }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les contrasenyes no son iguals!",
    path: ["confirmPassword"], // This will attach the error to the confirmPassword field
  });
