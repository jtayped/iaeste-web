import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../../trpc";
import { TRPCError } from "@trpc/server";
import { generateToken } from "@repo/auth/lib/token";
import { sendEmail } from "@repo/email/resend";
import PasswordResetEmail from "@repo/email/password-reset";
import { password } from "@repo/auth/validators/credentials";
import { hashPassword } from "@repo/auth/lib/password";

export const passwordRouter = createTRPCRouter({
  requestReset: publicProcedure
    .input(z.object({ email: z.string() }))
    .mutation(async ({ ctx, input: { email } }) => {
      const user = await ctx.db.user.findUnique({ where: { email } });
      if (!user) throw new TRPCError({ code: "NOT_FOUND" });

      const { token, expiry } = generateToken();

      await Promise.all([
        ctx.db.passwordResetToken.create({
          data: { token, expiry, email },
        }),
        sendEmail(
          email,
          "Canvi de contrasenya",
          PasswordResetEmail({
            email,
            link: `https://admin.iaestelleida.cat/auth/password-reset?token=${token}`,
          })
        ),
      ]);
    }),
  reset: publicProcedure
    .input(z.object({ token: z.string(), password }))
    .mutation(async ({ ctx, input: { token, password } }) => {
      // Check if the token is valid
      const passwordResetToken = await ctx.db.passwordResetToken.findUnique({
        where: { token, expiry: { lt: new Date() } },
      });
      if (!passwordResetToken)
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "This token is either expired or invalid.",
        });

      // Update the user with the hashed password
      const hashedPassword = await hashPassword(password);
      await ctx.db.user.update({
        where: { email: passwordResetToken.email },
        data: { password: hashedPassword },
      });
    }),
});
