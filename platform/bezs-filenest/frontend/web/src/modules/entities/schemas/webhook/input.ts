/**
 * entities/schemas/webhook/input — mutation input schemas for webhooks.
 *
 * Used by controllers (server-side validation) and forms (client-side).
 * No React or Next.js imports — safe in both environments.
 *
 * @module
 */
import { z } from "zod";

export const WEBHOOK_EVENTS = [
  "file.uploaded",
  "file.ready",
  "file.failed",
  "file.quarantined",
  "file.deleted",
] as const;

export type TWebhookEvent = (typeof WEBHOOK_EVENTS)[number];

export const ListWebhooksParamsSchema = z.object({
  projectId: z.string().min(1),
});

export type TListWebhooksParams = z.infer<typeof ListWebhooksParamsSchema>;

export const CreateWebhookSchema = z.object({
  projectId: z.string().min(1),
  url: z.string().url("Must be a valid URL"),
  events: z.array(z.string()).default([]),
  is_active: z.boolean().default(true),
});

export type TCreateWebhook = z.infer<typeof CreateWebhookSchema>;

export const UpdateWebhookSchema = z.object({
  projectId: z.string().min(1),
  webhookId: z.string().min(1),
  url: z.string().url().optional(),
  events: z.array(z.string()).optional(),
  is_active: z.boolean().optional(),
});

export type TUpdateWebhook = z.infer<typeof UpdateWebhookSchema>;

export const DeleteWebhookSchema = z.object({
  projectId: z.string().min(1),
  webhookId: z.string().min(1),
});

export type TDeleteWebhook = z.infer<typeof DeleteWebhookSchema>;
