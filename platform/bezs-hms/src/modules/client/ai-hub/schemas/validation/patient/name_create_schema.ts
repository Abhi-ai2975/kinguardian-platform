import { z } from "zod";

export const nameCreateSchema = z.object({
  use: z
    .enum(["usual", "official", "temp", "nickname", "anonymous", "old", "maiden"])
    .optional(),
  family: z.string().optional(),
  given: z
    .string()
    .optional()
    .transform((v) => (v ? [v] : undefined)),
  prefix: z
    .string()
    .optional()
    .transform((v) => (v ? [v] : undefined)),
  suffix: z
    .string()
    .optional()
    .transform((v) => (v ? [v] : undefined)),
});
