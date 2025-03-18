import { PrismaClient } from "@prisma/client";
import { pagination } from "prisma-extension-pagination";
import groups from "./extensions/group";

const createPrismaClient = () =>
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  })
    .$extends(
      pagination({
        pages: {
          limit: 15,
          includePageCount: true,
        },
      })
    )
    .$extends(groups);

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
