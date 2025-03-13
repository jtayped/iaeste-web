import { z } from "zod";

import { createTRPCRouter, adminProcedure, publicProcedure } from "@/trpc";
import { TRPCError } from "@trpc/server";
import { InvitationState } from "@prisma/client";
import { Pagination } from "@/validators/pagination";

const invitationProcedure = publicProcedure
  .input(z.object({ id: z.string() }))
  .use(async ({ ctx, input: { id }, next }) => {
    const invitation = await ctx.db.invitation.findUnique({ where: { id } });

    // Check if invitation exists
    if (!invitation) throw new TRPCError({ code: "NOT_FOUND" });

    // Check if invite has expired
    const now = new Date();
    if (invitation.expires < now) {
      // If so, update the current object and the db
      invitation.state = InvitationState.EXPIRED;
      await ctx.db.invitation.update({
        where: { id },
        data: { state: InvitationState.EXPIRED },
      });
    }

    // Add the invitation to the context
    return next({ ctx: { invitation, ...ctx } });
  });

export const invitationRouter = createTRPCRouter({
  getById: invitationProcedure.query(async ({ ctx }) => ctx.invitation),
  getByEmail: adminProcedure
    .input(z.object({ email: z.string().email() }))
    .query(async ({ ctx, input: { email } }) => {
      const invitation = await ctx.db.invitation.findFirst({
        where: { email },
        orderBy: { createdAt: "desc" },
      });
      if (!invitation) throw new TRPCError({ code: "NOT_FOUND" });

      return invitation;
    }),
  getAll: adminProcedure
    .input(Pagination)
    .query(async ({ ctx, input: { page, limit } }) => {
      const result = await ctx.db.invitation
        .paginate()
        .withPages({ page, limit });

      return result;
    }),
  send: adminProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ ctx, input: { email } }) => {
      // Calculate expiry date (7 days)
      const currentDate = new Date();
      const expires = new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000);

      await Promise.all([
        ctx.db.invitation.create({
          data: {
            email,
            expires,
            senderId: ctx.session.user.id,
          },
        }),
        // TODO: send email
      ]);
    }),
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input: { id } }) => {
      const invitation = await ctx.db.invitation.findUnique({
        where: { id },
      });

      // Check if invitation exists
      if (!invitation) throw new TRPCError({ code: "NOT_FOUND" });

      // Check if the invitation has already been accepted or rejected
      if (invitation.state !== InvitationState.PENDING)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "This invitation has already been accepted or rejected and cannot be canceled.",
        });

      await ctx.db.invitation.delete({ where: { id } });
    }),
  accept: invitationProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input: { id } }) => {
      if (ctx.invitation.state !== InvitationState.PENDING)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This invitation has already been accepted or rejected.",
        });

      await Promise.all([
        // Change 'accepted' to true
        ctx.db.invitation.update({
          where: { id },
          data: { state: InvitationState.ACCEPTED },
        }),

        // Create the user
        ctx.db.user.create({
          data: { email: ctx.invitation.email, emailVerified: new Date() },
        }),

        // TODO: Send notification
      ]);
    }),
  reject: invitationProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input: { id } }) => {
      if (ctx.invitation.state !== InvitationState.PENDING)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This invitation has already been accepted.",
        });

      await Promise.all([
        ctx.db.invitation.update({
          where: { id },
          data: { state: InvitationState.REJECTED },
        }),

        // TODO: send notification to sender
      ]);
    }),
});
