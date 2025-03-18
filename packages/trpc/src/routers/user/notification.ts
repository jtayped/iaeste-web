import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../../trpc";
import { Cursor } from "../../validators/pagination";

export const notificationRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(z.object({ seen: z.boolean().default(true) }).and(Cursor))
    .query(async ({ ctx, input: { cursor, limit } }) => {
      const [notifications, meta] = await ctx.db.notification
        .paginate({
          where: { receiverId: ctx.session.user.id, seen: false },
          include: {
            sender: true,
            receiver: true,
            group: true,
            reunion: true,
            request: true,
            invite: true,
          },
          orderBy: { createdAt: "desc" },
        })
        .withCursor({ limit, after: cursor });

      return { notifications, ...meta };
    }),
});
