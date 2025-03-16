import { adminProcedure, createTRPCRouter, publicProcedure } from "../../trpc";
import { RequestState } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { Pagination } from "../../validators/pagination";

const requestProcedure = publicProcedure
  .input(z.object({ id: z.string() }))
  .use(async ({ ctx, input: { id }, next }) => {
    const request = await ctx.db.request.findUnique({ where: { id } });

    // Check if request exists
    if (!request) throw new TRPCError({ code: "NOT_FOUND" });

    // Add to context
    return next({ ctx: { request, ...ctx } });
  });

export const requestRouter = createTRPCRouter({
  getById: requestProcedure.query(({ ctx }) => ctx.request),
  getByEmail: adminProcedure
    .input(z.object({ email: z.string() }))
    .query(async ({ ctx, input: { email } }) => {
      const request = await ctx.db.request.findFirst({ where: { email } });
      if (!request) throw new TRPCError({ code: "NOT_FOUND" });

      return request;
    }),
  getAll: adminProcedure
    .input(Pagination)
    .query(async ({ ctx, input: { page, limit } }) => {
      const result = await ctx.db.request.paginate().withPages({ page, limit });
      return result;
    }),
  send: publicProcedure
    .input(z.object({ name: z.string().min(4), email: z.string().email() }))
    .mutation(async ({ ctx, input: { name, email } }) => {
      // Check if email already exists
      const user = await ctx.db.user.findFirst({ where: { email } });
      if (user)
        throw new TRPCError({
          code: "CONFLICT",
          message: "User already exists.",
        });

      // Check if there are any other pending requests
      const pendingRequest = await ctx.db.request.findFirst({
        where: { email, state: RequestState.PENDING },
      });
      if (pendingRequest)
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "A request has already been sent and is awaiting a response.",
        });

      await Promise.all([
        ctx.db.request.create({ data: { name, email } }),

        // TODO: send email to verify email ownership
        // TODO: send notifications to admins
      ]);
    }),

  accept: requestProcedure.mutation(async ({ ctx, input: { id } }) => {
    if (ctx.request.state !== RequestState.PENDING)
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Request has already been accepted or rejected.",
      });

    const { name, email } = ctx.request;

    await Promise.all([
      // Change state to ACCEPTED
      ctx.db.request.update({
        where: { id },
        data: { state: RequestState.ACCEPTED },
      }),

      // Create user
      ctx.db.user.create({ data: { name, email } }),
    ]);
  }),

  reject: requestProcedure.mutation(async ({ ctx, input: { id } }) => {
    if (ctx.request.state !== RequestState.PENDING)
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Request has already been accepted or rejected.",
      });

    await Promise.all([
      // Change the state to REJECTED
      ctx.db.request.update({
        where: { id },
        data: { state: RequestState.REJECTED },
      }),

      // TODO: send rejection email to requestee
    ]);
  }),
});
