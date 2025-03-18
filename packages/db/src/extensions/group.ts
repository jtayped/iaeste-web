import { Prisma } from "@prisma/client";

export default Prisma.defineExtension({
  name: "group-extension",
  query: {
    group: {
      async findUnique({ args, query }) {
        args.include = {
          ...args.include, // Include the first 15 participants by alphabetical order
          participants: { take: 15, orderBy: { name: "asc" } },

          // Include future reunions
          reunions: {
            where: { scheduledFor: { gt: new Date() } },
            orderBy: { scheduledFor: "asc" },
          },

          // Include the number of participants
        };

        return query(args);
      },
      async findMany({ args, query }) {
        const today = new Date();
        const tomorrow = new Date();
        tomorrow.setDate(today.getDate() + 24);

        args.include = {
          ...args.include,
          _count: { select: { participants: true } },

          // Include today's reunions
          reunions: {
            where: { scheduledFor: { gt: today, lt: tomorrow } },
          },
        };

        return query(args);
      },
    },
  },
});
