import { createTRPCRouter } from "../../trpc";
import { experienceRouter } from "./experience";
import { postRouter } from "./post";

export const blogRouter = createTRPCRouter({
  experience: experienceRouter,
  post: postRouter,
});
