/**
 * entities/schemas/webhook/forms — React Hook Form schemas for webhook forms.
 *
 * Flat schemas designed for RHF register/Controller usage.
 * Separate from input.ts because forms omit projectId/webhookId (taken from route).
 *
 * @module
 */
import { z } from "zod";

export const CreateWebhookFormSchema = z.object({
  url: z.string().url("Must be a valid HTTPS URL"),
  events: z.array(z.string()).default([]),
  is_active: z.boolean().default(true),
});

export type TCreateWebhookForm = z.infer<typeof CreateWebhookFormSchema>;
