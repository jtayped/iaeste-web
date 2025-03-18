import { z } from "zod";
import {
  adminProcedure,
  createTRPCRouter,
  protectedProcedure,
} from "../../trpc";
import { Pagination } from "../../validators/pagination";
import { TRPCError } from "@trpc/server";
import { Group } from "../../validators/group";
import { participantRouter } from "./participant";
import { invitationRouter } from "./invitation";
import { NotificationType } from "@prisma/client";

export const groupProcedure = protectedProcedure
  .input(z.object({ id: z.string() }))
  .use(async ({ ctx, input: { id }, next }) => {
    const group = await ctx.db.group.findUnique({ where: { id } });
    if (!group) throw new TRPCError({ code: "NOT_FOUND" });

    return next({ ctx: { ...ctx, group } });
  });

export const groupRouter = createTRPCRouter({
  participant: participantRouter,
  invitation: invitationRouter,
  getAll: protectedProcedure
    .input(Pagination)
    .query(async ({ ctx, input: { page, limit } }) => {
      const today = new Date();
      const tomorrow = new Date();
      tomorrow.setDate(today.getDate() + 24);

      const result = await ctx.db.group.paginate().withPages({ page, limit });
      return result;
    }),
  getById: groupProcedure.query(({ ctx }) => ctx.group),
  getByName: protectedProcedure
    .input(z.object({ name: z.string() }))
    .query(async ({ ctx, input: { name } }) => {
      const group = ctx.db.group.findUnique({ where: { name } });
      if (!group) throw new TRPCError({ code: "NOT_FOUND" });

      return group;
    }),
  search: protectedProcedure
    .input(z.object({ query: z.string() }).and(Pagination))
    .query(async ({ ctx, input: { query, page, limit } }) => {
      const result = await ctx.db.group
        .paginate({
          where: { name: { contains: query, mode: "insensitive" } },
        })
        .withPages({ page, limit });

      return result;
    }),
  create: adminProcedure
    .input(Group.and(z.object({ participants: z.array(z.string()) })))
    .mutation(async ({ ctx, input: { participants, ...groupData } }) => {
      // Create the group with all the participatns
      const { id: groupId } = await ctx.db.group.create({
        data: {
          participants: { create: participants?.map((id) => ({ id })) },
          ...groupData,
        },
        select: { id: true },
      });

      // Send invite notifications to all new participants except the creator
      await ctx.db.notification.createMany({
        data: participants
          ?.filter((id) => id !== ctx.session.user.id)
          .map((id) => ({
            type: NotificationType.GROUP_INVITE,
            senderId: ctx.session.user.id,
            receiverId: id,
            groupId,
          })),
      });
    }),
  edit: adminProcedure
    .input(z.object({ id: z.string() }).and(Group.partial()))
    .mutation(async ({ ctx, input: { id, ...groupData } }) => {
      await ctx.db.group.update({ where: { id }, data: groupData });
    }),
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input: { id } }) => {
      await ctx.db.group.delete({ where: { id } });
    }),
});
