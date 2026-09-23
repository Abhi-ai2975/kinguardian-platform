import { z } from "zod";

export const telecomCreateSchema = z.object({
  system: z.enum(["phone", "fax", "email", "pager", "url", "sms", "other"]),
  value: z.string().min(1, "Contact value is required"),
  use: z.enum(["home", "work", "temp", "old", "mobile"]).optional(),
  rank: z.number().int().min(1).optional(),
  period_start: z.string().optional(),
  period_end: z.string().optional(),
});
