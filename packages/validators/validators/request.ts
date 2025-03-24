import { z } from "zod";

const Request = z.object({
  name: z.string().min(3).max(50),
  email: z.string().email(),
  comment: z.string().max(999).optional(),
});

export default Request;
