import { createTRPCRouter } from "../../trpc";
import { invitationRouter } from "./invitation";
import { requestRouter } from "./request";

export const organisationRouter = createTRPCRouter({
    invitation: invitationRouter,
    request: requestRouter
});
