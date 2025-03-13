import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "@/trpc";

export const userRouter = createTRPCRouter({
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input: { id } }) =>
      ctx.db.user.findUniqueOrThrow({ where: { id } })
    ),
});
