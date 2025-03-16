import { z } from "zod";

export const Reunion = z.object({
    title: z.string(),
    description: z.string(),
    scheduledFor: z.date(),
    groupId: z.string().optional(),
})