import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../../trpc";

export const invitationRouter = createTRPCRouter({
  reject: protectedProcedure
    .input(
      z.object({
        excuse: z.string().min(3).max(999).optional(),
        inviteId: z.string(),
      })
    )
    .mutation(async ({ ctx, input: { inviteId, excuse } }) => {
      await Promise.all([
        ctx.db.reunionInvitation.update({
          where: { id: inviteId, participantId: ctx.session.user.id },
          data: { willAssist: false, excuse },
        }),
        // TODO: send notification to admins from the group
      ]);
    }),
});
