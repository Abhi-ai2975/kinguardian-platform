/**
 * Barrel export for all webhook controllers and their output types.
 *
 * @module
 */
export {
  listWebhooksController,
  type TListWebhooksControllerOutput,
} from "./listWebhooks.controller";
export {
  createWebhookController,
  type TCreateWebhookControllerOutput,
} from "./createWebhook.controller";
export {
  updateWebhookController,
  type TUpdateWebhookControllerOutput,
} from "./updateWebhook.controller";
export {
  deleteWebhookController,
  type TDeleteWebhookControllerOutput,
} from "./deleteWebhook.controller";
