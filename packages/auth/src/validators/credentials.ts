import z from "zod";

export const Credentials = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const password = z.string().min(3).max(500);
