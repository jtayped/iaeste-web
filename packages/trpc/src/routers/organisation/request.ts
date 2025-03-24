import { adminProcedure, createTRPCRouter, publicProcedure } from "../../trpc";
import { NotificationType, RequestState } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { Pagination } from "../../validators/pagination";
import RequestSchema from "@repo/validators/request";

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
      const request = await ctx.db.request.findFirst({
        where: { user: { email } },
      });
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
    .input(RequestSchema)
    .mutation(async ({ ctx, input: { name, email, comment } }) => {
      // Check if email already exists
      const user = await ctx.db.user.findFirst({ where: { email } });
      if (user)
        throw new TRPCError({
          code: "CONFLICT",
          message: "User already exists.",
        });

      // Check if there are any other pending requests
      const pendingRequest = await ctx.db.request.findFirst({
        where: { user: { email }, state: RequestState.PENDING },
      });
      if (pendingRequest)
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "A request has already been sent and is awaiting a response.",
        });

      const [admins, request] = await Promise.all([
        ctx.db.user.findMany({
          where: { isAdmin: true },
          select: { id: true },
        }),
        ctx.db.request.create({
          data: {
            user: {
              connectOrCreate: {
                where: { email, isParticipant: false },
                create: { name, email },
              },
            },
            comment,
          },
        }),
      ]);

      await Promise.all([
        // TODO: send email to verify email ownership

        ctx.db.notification.createMany({
          data: admins.map(({ id }) => ({
            type: NotificationType.ORGANISATION_REQUEST,
            receiverId: id,
            requestId: request.id,
          })),
        }),
      ]);
    }),
  cancel: requestProcedure.mutation(async ({ ctx, input: { id } }) => {
    if (ctx.request.state !== RequestState.PENDING)
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          "This request has already been accepted or rejected, and cannot be canceled.",
      });

    await Promise.all([
      ctx.db.request.update({
        where: { id },
        data: { state: RequestState.CANCELLED },
      }),
    ]);
  }),

  accept: requestProcedure.mutation(async ({ ctx, input: { id } }) => {
    if (ctx.request.state !== RequestState.PENDING)
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Request has already been accepted or rejected.",
      });

    await Promise.all([
      // Change state to ACCEPTED and update the user's state
      ctx.db.request.update({
        where: { id },
        data: {
          state: RequestState.ACCEPTED,
          user: { update: { isParticipant: true } },
        },
      }),
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
