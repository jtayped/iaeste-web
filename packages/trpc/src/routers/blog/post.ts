import { z } from "zod";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
} from "../../trpc";
import { TRPCError } from "@trpc/server";
import { Post } from "../../validators/blog";
import { Pagination } from "../../validators/pagination";

const postProcedure = publicProcedure
  .input(z.object({ id: z.string() }))
  .use(async ({ ctx, input: { id }, next }) => {
    const post = await ctx.db.blogPost.findUnique({ where: { id } });
    if (!post) throw new TRPCError({ code: "NOT_FOUND" });

    return next({ ctx: { ...ctx, post } });
  });

export const postRouter = createTRPCRouter({
  getById: postProcedure.query(({ ctx }) => ctx.post),
  getByPath: publicProcedure
    .input(z.object({ path: z.string() }))
    .query(async ({ ctx, input: { path } }) => {
      const post = await ctx.db.blogPost.findUnique({ where: { path } });
      if (!post) throw new TRPCError({ code: "NOT_FOUND" });

      return post;
    }),
  getAll: publicProcedure
    .input(Pagination)
    .query(async ({ ctx, input: { page, limit } }) => {
      const result = await ctx.db.blogPost
        .paginate()
        .withPages({ page, limit });
      return result;
    }),
  create: protectedProcedure
    .input(Post)
    .mutation(async ({ ctx, input: postData }) => {
      // TODO: add cover uploading functionality
      const post = await ctx.db.blogPost.create({ data: postData });
      return post;
    }),
  edit: protectedProcedure
    .input(Post.partial().and(z.object({ id: z.string() })))
    .mutation(async ({ ctx, input: { id, ...postData } }) => {
      const post = await ctx.db.blogPost.update({
        where: { id },
        data: postData,
      });

      return post;
    }),
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input: { id } }) => {
      await ctx.db.blogPost.delete({ where: { id } });
    }),
});
