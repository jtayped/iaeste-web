import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "@/trpc";
import { invitationRouter } from "./invitation";

export const organisationRouter = createTRPCRouter({
    invitation: invitationRouter,
    
});
