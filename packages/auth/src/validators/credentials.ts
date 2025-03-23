import z from "zod";

export const Credentials = z.object({
  email: z.string().email(),
  password: z.string(),
});
