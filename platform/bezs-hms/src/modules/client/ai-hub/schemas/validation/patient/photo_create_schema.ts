import { z } from "zod";

export const photoCreateSchema = z.object({
  url: z.string().optional(),
  content_type: z.string().optional(),
  language: z.string().optional(),
  title: z.string().optional(),
});
