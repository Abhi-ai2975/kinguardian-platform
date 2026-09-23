import { z } from "zod";

export const gpCreateSchema = z.object({
  reference_type: z.enum(["Organization", "Practitioner", "PractitionerRole"]),
  reference_id: z.coerce.number().int().positive("Provider ID must be a positive integer"),
  reference_display: z.string().optional(),
});
