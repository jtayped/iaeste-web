import { z } from "zod";
import {
  adminProcedure,
  createTRPCRouter,
  protectedProcedure,
} from "../../trpc";
import { invitationRouter } from "./invitation";
import { TRPCError } from "@trpc/server";
import { Pagination } from "../../validators/pagination";
import { Reunion } from "../../validators/reunion";
import { NotificationType } from "@prisma/client";

export const reunionRouter = createTRPCRouter({
  invitation: invitationRouter,
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input: { id } }) => {
      const reunion = await ctx.db.reunion.findUnique({
        where: {
          group: { participants: { some: { id: ctx.session.user.id } } },
          id,
        },
        include: { _count: { select: { invites: true } } },
      });
      if (!reunion) throw new TRPCError({ code: "NOT_FOUND" });

      return reunion;
    }),
  getAll: protectedProcedure
    .input(Pagination.and(z.object({ groupId: z.string().optional() })))
    .query(async ({ ctx, input: { groupId, page, limit } }) => {
      const result = await ctx.db.reunion
        .paginate({
          where: { invites: { some: { id: ctx.session.user.id } }, groupId },
          orderBy: { scheduledFor: "asc" },
        })
        .withPages({ page, limit });

      return result;
    }),
  create: adminProcedure
    .input(Reunion.and(z.object({ invites: z.array(z.string()) })))
    .mutation(async ({ ctx, input: { invites, ...reunionData } }) => {
      // Add user to invites by default
      if (!invites.includes(ctx.session.user.id))
        invites.push(ctx.session.user.id);

      // Create the reunion and connect all invies to users
      const reunion = await ctx.db.reunion.create({
        data: {
          invites: { connect: invites.map((id) => ({ id })) },
          ...reunionData,
        },
      });

      // Send notifications to all invitees
      await ctx.db.notification.createMany({
        data: invites
          .filter((id) => id !== ctx.session.user.id)
          .map((id) => ({
            type: NotificationType.REUNION_INVITE,
            senderId: ctx.session.user.id,
            reunionId: reunion.id,
            receiverId: id,
          })),
      });
    }),
  edit: adminProcedure
    .input(
      Reunion.omit({ groupId: true })
        .partial()
        .and(z.object({ id: z.string() }))
    )
    .mutation(async ({ ctx, input: { id, ...reunionData } }) => {
      const invitees = await ctx.db.user.findMany({
        where: { reunions: { some: { id } } },
        select: { id: true },
      });

      await Promise.all([
        ctx.db.reunion.update({ where: { id }, data: reunionData }),

        // Send notification to all invitees
        ctx.db.notification.createMany({
          data: invitees.map(({ id }) => ({
            type: NotificationType.REUNION_EDITED,
            senderId: ctx.session.user.id,
            receiverId: id,
            reunionId: id,
          })),
        }),
      ]);
    }),
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input: { id } }) => {
      const invitees = await ctx.db.user.findMany({
        where: { reunions: { some: { id } } },
        select: { id: true },
      });

      await Promise.all([
        ctx.db.reunion.delete({ where: { id } }),

        // Send notification to all invitees
        ctx.db.notification.createMany({
          data: invitees.map(({ id }) => ({
            type: NotificationType.REUNION_DELETED,
            senderId: ctx.session.user.id,
            receiverId: id,
            reunionId: id,
          })),
        }),
      ]);
    }),
});
