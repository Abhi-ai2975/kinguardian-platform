import { z } from "zod";

export const linkCreateSchema = z.object({
  other_type: z.enum(["Patient", "RelatedPerson"]),
  other_id: z.coerce.number().int().positive("Linked resource ID must be a positive integer"),
  type: z.enum(["replaced-by", "replaces", "refer", "seealso"]),
  other_display: z.string().optional(),
});
