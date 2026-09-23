import { z } from "zod";

export const identifierCreateSchema = z.object({
  use: z.string().optional(),
  type_code: z.string().optional(),
  type_system: z.string().optional(),
  type_display: z.string().optional(),
  type_text: z.string().optional(),
  system: z.string().optional(),
  value: z.preprocess(
    (v) => (v === undefined ? "" : v),
    z.string().min(1, "Identifier value is required"),
  ),
  period_start: z.string().optional(),
  period_end: z.string().optional(),
});
