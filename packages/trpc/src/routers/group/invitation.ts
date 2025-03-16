import { z } from "zod";
import {
  adminProcedure,
  createTRPCRouter,
  protectedProcedure,
} from "../../trpc";
import { GroupInviteState } from "@prisma/client";

export const invitationRouter = createTRPCRouter({
  send: adminProcedure
    .input(z.object({ groupId: z.string(), userId: z.string() }))
    .mutation(async ({ ctx, input: { groupId, userId } }) => {
      Promise.all([
        ctx.db.groupInvite.create({
          data: { userId, groupId, senderId: ctx.session.user.id },
        }),

        // TODO: send notification to user
      ]);
    }),
  cancel: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input: { id } }) => {
      await ctx.db.groupInvite.update({
        where: { id },
        data: { state: GroupInviteState.CANCELLED },
      });
    }),
  accept: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input: { id } }) => {
      Promise.all([
        ctx.db.groupInvite.update({
          where: {
            id,
            userId: ctx.session.user.id,
            state: GroupInviteState.PENDING,
          },
          data: {
            state: GroupInviteState.ACCEPTED,
            group: {
              update: {
                participants: { connect: { id: ctx.session.user.id } },
              },
            },
          },
        }),
        // TODO: send notifications to group participants
      ]);
    }),
  reject: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input: { id } }) => {
      Promise.all([
        ctx.db.groupInvite.update({
          where: {
            id,
            userId: ctx.session.user.id,
            state: GroupInviteState.PENDING,
          },
          data: { state: GroupInviteState.REJECTED },
        }),

        // TODO: send notification to group participants who are admins
      ]);
    }),
});
