import { z } from "zod";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
} from "../../trpc";
import { TRPCError } from "@trpc/server";
import { Experience } from "../../validators/blog";
import { Pagination } from "../../validators/pagination";

const experienceProcedure = publicProcedure
  .input(z.object({ id: z.string() }))
  .use(async ({ ctx, input: { id }, next }) => {
    const post = await ctx.db.experience.findUnique({ where: { id } });
    if (!post) throw new TRPCError({ code: "NOT_FOUND" });

    return next({ ctx: { ...ctx, post } });
  });

export const experienceRouter = createTRPCRouter({
  getById: experienceProcedure.query(({ ctx }) => ctx.post),
  getByPath: publicProcedure
    .input(z.object({ path: z.string() }))
    .query(async ({ ctx, input: { path } }) => {
      const post = await ctx.db.experience.findUnique({ where: { path } });
      if (!post) throw new TRPCError({ code: "NOT_FOUND" });

      return post;
    }),
  getAll: publicProcedure
    .input(Pagination)
    .query(async ({ ctx, input: { page, limit } }) => {
      const result = await ctx.db.experience
        .paginate()
        .withPages({ page, limit });
      return result;
    }),
  create: protectedProcedure
    .input(Experience)
    .mutation(async ({ ctx, input: postData }) => {
      // TODO: add cover uploading functionality
      const post = await ctx.db.experience.create({ data: postData });
      return post;
    }),
  edit: protectedProcedure
    .input(Experience.partial().and(z.object({ id: z.string() })))
    .mutation(async ({ ctx, input: { id, ...postData } }) => {
      const post = await ctx.db.experience.update({
        where: { id },
        data: postData,
      });

      return post;
    }),
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input: { id } }) => {
      await ctx.db.experience.delete({ where: { id } });
    }),
});
