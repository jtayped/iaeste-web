import { z } from "zod";

export const Experience = z.object({
  title: z.string().min(3).max(50),
  content: z.string().min(10),
  quote: z.string().min(3).max(40).optional(),
  name: z.string(),
  country: z.string(),
  fieldOfStudy: z.string(),
  startDate: z.date(),
  endDate: z.string(),
  path: z.string(),
  metaDescription: z.string().optional(),
});
