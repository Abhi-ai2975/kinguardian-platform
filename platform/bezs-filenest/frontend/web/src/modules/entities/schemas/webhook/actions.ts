/**
 * entities/schemas/webhook/actions — ZSA action envelope schemas for webhooks.
 *
 * Every action schema wraps a payload with optional transportOptions so any
 * action can trigger revalidation or redirect via runWithTransport.
 *
 * @module
 */
import { z } from "zod";
import { TransportOptionsSchema } from "@/modules/entities/schemas/transport";
import {
  ListWebhooksParamsSchema,
  CreateWebhookSchema,
  UpdateWebhookSchema,
  DeleteWebhookSchema,
} from "./input";

export const ListWebhooksActionSchema = z.object({
  payload: ListWebhooksParamsSchema,
  transportOptions: TransportOptionsSchema.optional(),
});

export type TListWebhooksAction = z.infer<typeof ListWebhooksActionSchema>;

export const CreateWebhookActionSchema = z.object({
  payload: CreateWebhookSchema,
  transportOptions: TransportOptionsSchema.optional(),
});

export type TCreateWebhookAction = z.infer<typeof CreateWebhookActionSchema>;

export const UpdateWebhookActionSchema = z.object({
  payload: UpdateWebhookSchema,
  transportOptions: TransportOptionsSchema.optional(),
});

export type TUpdateWebhookAction = z.infer<typeof UpdateWebhookActionSchema>;

export const DeleteWebhookActionSchema = z.object({
  payload: DeleteWebhookSchema,
  transportOptions: TransportOptionsSchema.optional(),
});

export type TDeleteWebhookAction = z.infer<typeof DeleteWebhookActionSchema>;
