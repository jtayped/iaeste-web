import { z } from "zod";
import {
  adminProcedure,
  createTRPCRouter,
  protectedProcedure,
} from "../../trpc";
import { NotificationType } from "@prisma/client";

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
      const result = await Promise.all([
        ctx.db.group.update({
          where: { id },
          data: {
            participants: {
              disconnect: { id: ctx.session.user.id },
            },
          },
        }),
        ctx.db.user.findMany({
          where: {
            groups: {
              some: { id },
            },
            isAdmin: true,
          },
          select: { id: true },
        }),
      ]);
      const admins = result[1];

      // Create notifications for all admins
      await ctx.db.notification.createMany({
        data: admins.map((admin) => ({
          type: NotificationType.GROUP_PARTICIPANT_LEFT,
          receiverId: admin.id,
          groupId: id,
          senderId: ctx.session.user.id, // The user who left
        })),
      });
    }),
  kick: adminProcedure
    .input(z.object({ groupId: z.string(), userId: z.string() }))
    .mutation(async ({ ctx, input: { groupId, userId } }) => {
      await Promise.all([
        ctx.db.group.update({
          where: { id: groupId },
          data: { participants: { disconnect: { id: userId } } },
        }),

        ctx.db.notification.create({
          data: {
            type: NotificationType.GROUP_KICKED,
            senderId: ctx.session.user.id,
            receiverId: userId,
            groupId,
          },
        }),
      ]);
    }),
});
