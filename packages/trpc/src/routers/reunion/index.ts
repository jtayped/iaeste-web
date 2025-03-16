import { createTRPCRouter } from "../../trpc";
import { invitationRouter } from "./invitation";

export const reunionRouter = createTRPCRouter({
  invitation: invitationRouter,
});
