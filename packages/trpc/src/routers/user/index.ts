import { createTRPCRouter, publicProcedure } from "../../trpc";
import { userSchema } from "@repo/constants/validators/user";
import { TRPCError } from "@trpc/server";
import { appendUser } from "../../lib/google-sheets";

export const userRouter = createTRPCRouter({
  create: publicProcedure
    .input(userSchema)
    .mutation(async ({ input: data }) => {
      try {
        await appendUser(data);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Hi ha hagut un problema al crear l'usuari.",
          cause: error,
        });
      }
    }),
});
