import { z } from "zod";

export const communicationCreateSchema = z.object({
  language_code: z.string().min(2, "Language code is required (e.g. en, fr)"),
  language_system: z.string().optional(),
  language_display: z.string().optional(),
  language_text: z.string().optional(),
  preferred: z.boolean().optional(),
});
