import { z } from "zod";
import {
  adminProcedure,
  createTRPCRouter,
  protectedProcedure,
} from "../../trpc";
import { Pagination } from "../../validators/pagination";
import { reunionRouter } from "./reunion";
import { TRPCError } from "@trpc/server";
import { Group } from "../../validators/group";

export const groupRouter = createTRPCRouter({
  reunion: reunionRouter,
  getAll: protectedProcedure
    .input(Pagination)
    .query(async ({ ctx, input: { page, limit } }) => {
      const today = new Date();
      const tomorrow = new Date();
      tomorrow.setDate(today.getDate() + 24);

      const result = await ctx.db.group.paginate().withPages({ page, limit });
      return result;
    }),
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input: { id } }) => {
      const group = await ctx.db.group.findUnique({
        where: { id },
      });
      if (!group) throw new TRPCError({ code: "NOT_FOUND" });

      return group;
    }),
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
      Promise.all([
        // Create the group with all the participatns
        ctx.db.group.create({
          data: {
            participants: { create: participants?.map((id) => ({ id })) },
            ...groupData,
          },
        }),

        // Send notifications to all the new participants
      ]);
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
