import { z } from "zod";

export const addressCreateSchema = z.object({
  use: z.string().optional(),
  type: z.string().optional(),
  text: z.string().optional(),
  line: z.string().optional().transform((v) => (v ? [v] : undefined)),
  city: z.string().optional(),
  district: z.string().optional(),
  state: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().optional(),
  period_start: z.string().optional(),
  period_end: z.string().optional(),
});
