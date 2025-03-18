import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "../../trpc";
import { createListSchema } from "../../validators/list";
import { transformSelectFields, transformOrderByClause } from "../../lib/list";
import { notificationRouter } from "./notification";

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
});
