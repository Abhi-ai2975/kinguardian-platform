/**
 * entities/schemas/webhook/response — Zod schemas for webhook API responses.
 *
 * Mirrors WebhookResponse and WebhookListResponse from the FastAPI backend.
 * signing_secret is nullable — only populated on creation, null on subsequent reads.
 *
 * @module
 */
import { z } from "zod";

export const WebhookSchema = z.object({
  id: z.string(),
  organization_id: z.string(),
  project_id: z.string(),
  url: z.string(),
  events: z.array(z.string()),
  is_active: z.boolean(),
  signing_secret: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type TWebhook = z.infer<typeof WebhookSchema>;

export const WebhookListSchema = z.object({
  items: z.array(WebhookSchema),
  total: z.number(),
});

export type TWebhookList = z.infer<typeof WebhookListSchema>;

export const WebhookDeliverySchema = z.object({
  id: z.string(),
  webhook_id: z.string(),
  event_type: z.string(),
  status: z.string(),
  attempt_count: z.number(),
  response_status_code: z.number().nullable(),
  response_body: z.string().nullable(),
  next_retry_at: z.string().nullable(),
  created_at: z.string(),
});

export type TWebhookDelivery = z.infer<typeof WebhookDeliverySchema>;
