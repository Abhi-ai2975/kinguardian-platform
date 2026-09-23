import { z } from "zod";

export const patientCreateSchema = z.object({
  // Seeded from the Better Auth session by route.ts — not entered by the user.
  user_id: z.string().optional(),
  org_id: z.string().optional(),
  gender: z.enum(["male", "female", "other", "unknown"]).optional(),
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD").optional(),
  active: z.boolean().optional(),
  deceased_boolean: z.boolean().optional(),
  deceased_datetime: z.string().optional(),
  marital_status_code: z.string().optional(),
  marital_status_system: z.string().optional(),
  marital_status_display: z.string().optional(),
  marital_status_text: z.string().optional(),
});
