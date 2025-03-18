import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../../trpc";
import { TRPCError } from "@trpc/server";
import { NotificationType, Prisma } from "@prisma/client";

export const invitationRouter = createTRPCRouter({
  reject: protectedProcedure
    .input(
      z.object({
        excuse: z.string().min(3).max(999).optional(),
        inviteId: z.string(),
      })
    )
    .mutation(async ({ ctx, input: { inviteId, excuse } }) => {
      // Find invitation before scheduled date
      const invite = await ctx.db.reunionInvitation.findUnique({
        where: { id: inviteId, reunion: { scheduledFor: { lt: new Date() } } },
        include: { reunion: true },
      });

      // Check if the invite has been found
      if (!invite)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invitation does not exist.",
        });

      // Default to all admins in the where clause
      const adminsWhereClause: Prisma.UserFindManyArgs["where"] = {};
      adminsWhereClause.isAdmin = true;

      // Send notification to only group admins if a group is specified
      if (invite.reunion.groupId)
        adminsWhereClause.groups = { some: { id: invite.reunion.groupId } };

      // Find all admin IDs
      const admins = await ctx.db.user.findMany({
        where: adminsWhereClause,
        select: { id: true },
      });

      await Promise.all([
        // Update the invite with the excuse if it exists
        ctx.db.reunionInvitation.update({
          where: { id: inviteId, participantId: ctx.session.user.id },
          data: { willAssist: false, excuse },
        }),

        // Send a notification to appropriate admins
        ctx.db.notification.createMany({
          data: admins.map(({ id }) => ({
            type: NotificationType.REUNION_INVITE_REJECTED,
            reunionId: invite.reunionId,
            senderId: ctx.session.user.id,
            receiverId: id,
          })),
        }),
      ]);
    }),
});
