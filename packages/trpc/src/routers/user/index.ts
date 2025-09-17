import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "../../trpc";
import { createListSchema } from "../../validators/list";
import { transformSelectFields, transformOrderByClause } from "../../lib/list";
import { notificationRouter } from "./notification";
import { userSchema } from "@repo/constants/validators/user";
import { TRPCError } from "@trpc/server";
import { Prisma } from "@prisma/client";
import { appendUser } from "../../lib/google-sheets";

export const userRouter = createTRPCRouter({
  notifications: notificationRouter,
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input: { id } }) =>
      ctx.db.user.findUniqueOrThrow({ where: { id } })
    ),
  list: publicProcedure
    .input(
      createListSchema(["name", "email", "isAdmin", "createdAt"]).and(
        z.object({ query: z.string() })
      )
    )
    .query(async ({ ctx, input: { select, orderBy, pagination, query } }) => {
      // Transform select and orderby to a prisma query
      const selectFields = transformSelectFields(select);
      const orderByClause = transformOrderByClause(orderBy);

      const result = await ctx.db.user
        .paginate({
          where: { name: { contains: query, mode: "insensitive" } },
          select: selectFields,
          orderBy: orderByClause,
        })
        .withPages(pagination);

      return result;
    }),
  create: publicProcedure
    .input(userSchema)
    .mutation(async ({ ctx, input: data }) => {
      try {
        const user = await ctx.db.inscripcions.create({
          data,
        });
        await appendUser(data);
        return user;
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          // error.meta.target is usually the field(s) that violated the unique constraint
          const target = error.meta?.target;
          // target might be a string or array of strings
          const fields = Array.isArray(target) ? target : [target];

          // Decide which field(s) are in there
          if (fields.includes("email")) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "Email ja utilitzat. Si us plau, utilitza un altre.",
            });
          }
          if (fields.includes("number")) {
            throw new TRPCError({
              code: "CONFLICT",
              message:
                "El número ja està registrat. Si us plau, utilitza un altre.",
            });
          }
          // fallback: generic conflict
          throw new TRPCError({
            code: "CONFLICT",
            message: "Ja existeix una entrada amb un valor duplicat.",
          });
        }
        // other errors
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Hi ha hagut un problema al crear l'usuari.",
          cause: error,
        });
      }
    }),
});
