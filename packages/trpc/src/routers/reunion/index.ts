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
      // TODO: send notifications to all invitees
      const reunion = await ctx.db.reunion.create({
        data: {
          invites: { connect: invites.map((id) => ({ id })) },
          ...reunionData,
        },
      });
      return reunion;
    }),
  edit: adminProcedure
    .input(
      Reunion.omit({ groupId: true })
        .partial()
        .and(z.object({ id: z.string() }))
    )
    .mutation(async ({ ctx, input: { id, ...reunionData } }) => {
      await Promise.all([
        ctx.db.reunion.update({ where: { id }, data: reunionData }),

        // TODO: send notifications to all invitees
      ]);
    }),
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input: { id } }) => {
      await Promise.all([
        ctx.db.reunion.delete({ where: { id } }),

        // TODO: send notifications to all invitees
      ]);
    }),
});
