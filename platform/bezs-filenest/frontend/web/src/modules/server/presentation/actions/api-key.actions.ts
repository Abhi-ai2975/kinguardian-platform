/**
 * server/presentation/actions/api-key.actions — ZSA server actions for API keys.
 *
 * Layer: presentation / actions
 * Resource: ApiKey (managed by IAM / BetterAuth)
 *
 * listApiKeysAction   — read; called from RSC pages and client on trigger.
 * createApiKeyAction  — mutation; returns the full key string (shown once).
 * revokeApiKeyAction  — mutation; revalidates the api-keys page.
 *
 * @module
 */
"use server";

import { authenticatedProcedure } from "./procedures";
import { runWithTransport } from "@/modules/server/utils/run-with-transport";
import {
  listApiKeysController,
  createApiKeyController,
  revokeApiKeyController,
  type TListApiKeysControllerOutput,
  type TCreateApiKeyControllerOutput,
  type TRevokeApiKeyControllerOutput,
} from "@/modules/server/core/api-key/interface-adapters/controllers";
import {
  ListApiKeysActionSchema,
  CreateApiKeyActionSchema,
  RevokeApiKeyActionSchema,
  type TListApiKeysAction,
  type TCreateApiKeyAction,
  type TRevokeApiKeyAction,
} from "@/modules/entities/schemas/api-key";

export const listApiKeysAction = authenticatedProcedure
  .createServerAction()
  .input(ListApiKeysActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TListApiKeysAction }) => {
    return await runWithTransport<TListApiKeysControllerOutput>(async () => {
      const data = await listApiKeysController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

export const createApiKeyAction = authenticatedProcedure
  .createServerAction()
  .input(CreateApiKeyActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TCreateApiKeyAction }) => {
    return await runWithTransport<TCreateApiKeyControllerOutput>(async () => {
      const data = await createApiKeyController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

export const revokeApiKeyAction = authenticatedProcedure
  .createServerAction()
  .input(RevokeApiKeyActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TRevokeApiKeyAction }) => {
    return await runWithTransport<TRevokeApiKeyControllerOutput>(async () => {
      await revokeApiKeyController(input.payload);
      return { result: undefined, transport: input.transportOptions };
    });
  });
