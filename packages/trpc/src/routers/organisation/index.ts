import { createTRPCRouter } from "../../trpc";
import { invitationRouter } from "./invitation";

export const organisationRouter = createTRPCRouter({
    invitation: invitationRouter,

});
