import { z } from "zod";
import {
  adminProcedure,
  createTRPCRouter,
  protectedProcedure,
} from "../../trpc";

export const participantRouter = createTRPCRouter({
  join: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input: { id } }) => {
      // Add the user to the group
      await ctx.db.group.update({
        where: { id },
        data: { participants: { connect: { id: ctx.session.user.id } } },
      });
    }),
  leave: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input: { id } }) => {
      // Remove the user from the group
      await ctx.db.group.update({
        where: { id },
        data: { participants: { disconnect: { id: ctx.session.user.id } } },
      });
    }),
  kick: adminProcedure
    .input(z.object({ groupId: z.string(), userId: z.string() }))
    .mutation(async ({ ctx, input: { groupId, userId } }) => {
      Promise.all([
        ctx.db.group.update({
          where: { id: groupId },
          data: { participants: { disconnect: { id: userId } } },
        }),

        // TODO: send notification to user
      ]);
    }),
});
