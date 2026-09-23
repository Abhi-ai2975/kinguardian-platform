/**
 * entities/schemas/api-key/forms — React Hook Form schemas for API key forms.
 *
 * Flat schemas that map 1:1 to form fields. Scopes are represented as an
 * array of strings matching AVAILABLE_SCOPES values.
 *
 * @module
 */
import { z } from "zod";
import { AVAILABLE_SCOPES } from "./input";

export const CreateApiKeyFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  scopes: z.array(z.enum(AVAILABLE_SCOPES)).min(1, "Select at least one scope"),
  expiresInDays: z.string().optional(),
});

export type TCreateApiKeyForm = z.infer<typeof CreateApiKeyFormSchema>;
