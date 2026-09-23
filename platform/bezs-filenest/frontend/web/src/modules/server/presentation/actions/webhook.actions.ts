/**
 * server/presentation/actions/webhook.actions — ZSA server actions for webhooks.
 *
 * Layer: presentation / actions
 * Resource: Webhook
 *
 * listWebhooksAction   — read; call from RSC pages or client components.
 * createWebhookAction  — mutation; revalidates webhooks page on success.
 * updateWebhookAction  — mutation; revalidates webhooks page on success.
 * deleteWebhookAction  — mutation; revalidates webhooks page on success.
 *
 * @module
 */
"use server";

import { authenticatedProcedure } from "./procedures";
import { runWithTransport } from "@/modules/server/utils/run-with-transport";
import {
  listWebhooksController,
  createWebhookController,
  updateWebhookController,
  deleteWebhookController,
  type TListWebhooksControllerOutput,
  type TCreateWebhookControllerOutput,
  type TUpdateWebhookControllerOutput,
  type TDeleteWebhookControllerOutput,
} from "@/modules/server/core/webhook/interface-adapters/controllers";
import {
  ListWebhooksActionSchema,
  CreateWebhookActionSchema,
  UpdateWebhookActionSchema,
  DeleteWebhookActionSchema,
  type TListWebhooksAction,
  type TCreateWebhookAction,
  type TUpdateWebhookAction,
  type TDeleteWebhookAction,
} from "@/modules/entities/schemas/webhook";

export const listWebhooksAction = authenticatedProcedure
  .createServerAction()
  .input(ListWebhooksActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TListWebhooksAction }) => {
    return await runWithTransport<TListWebhooksControllerOutput>(async () => {
      const data = await listWebhooksController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

export const createWebhookAction = authenticatedProcedure
  .createServerAction()
  .input(CreateWebhookActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TCreateWebhookAction }) => {
    return await runWithTransport<TCreateWebhookControllerOutput>(async () => {
      const data = await createWebhookController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

export const updateWebhookAction = authenticatedProcedure
  .createServerAction()
  .input(UpdateWebhookActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TUpdateWebhookAction }) => {
    return await runWithTransport<TUpdateWebhookControllerOutput>(async () => {
      const data = await updateWebhookController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

export const deleteWebhookAction = authenticatedProcedure
  .createServerAction()
  .input(DeleteWebhookActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TDeleteWebhookAction }) => {
    return await runWithTransport<TDeleteWebhookControllerOutput>(async () => {
      await deleteWebhookController(input.payload);
      return { result: undefined, transport: input.transportOptions };
    });
  });
