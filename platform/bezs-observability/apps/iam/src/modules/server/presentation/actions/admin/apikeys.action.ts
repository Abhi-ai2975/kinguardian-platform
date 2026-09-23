"use server";

import { superadminProcedure } from "../procedures";
import { runWithTransport } from "../../transport/runWithTransport";
import {
  listApiKeysController,
  TListApiKeysControllerOutput,
  createApiKeyController,
  TCreateApiKeyControllerOutput,
  updateApiKeyController,
  TUpdateApiKeyControllerOutput,
  deleteApiKeyController,
  TDeleteApiKeyControllerOutput,
  deleteExpiredApiKeysController,
  TDeleteExpiredApiKeysControllerOutput,
} from "@/modules/server/core/admin/interface-adapters/controllers/apikeys";
import {
  CreateApiKeyActionSchema,
  UpdateApiKeyActionSchema,
  DeleteApiKeyActionSchema,
  DeleteExpiredApiKeysActionSchema,
} from "@/modules/entities/schemas/admin/api-keys/api-keys.schema";
import z from "zod";

// ---------------------------------------------------------- //
// Query actions
// ---------------------------------------------------------- //

export const listApiKeysAction = superadminProcedure.createServerAction()
  .input(
    z.object({
      userId: z.string().optional(),
      organizationId: z.string().optional(),
      configId: z.string().optional(),
      limit: z.number().optional(),
      offset: z.number().optional(),
    }),
  )
  .handler(async ({ input }) => {
    return await runWithTransport<TListApiKeysControllerOutput>(async () => {
      const data = await listApiKeysController(input);
      return { result: data };
    });
  });

// ---------------------------------------------------------- //
// Mutation actions
// ---------------------------------------------------------- //

export const createApiKeyAction = superadminProcedure.createServerAction()
  .input(CreateApiKeyActionSchema, { skipInputParsing: true })
  .handler(async ({ input }) => {
    return await runWithTransport<TCreateApiKeyControllerOutput>(async () => {
      const data = await createApiKeyController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

export const updateApiKeyAction = superadminProcedure.createServerAction()
  .input(UpdateApiKeyActionSchema, { skipInputParsing: true })
  .handler(async ({ input }) => {
    return await runWithTransport<TUpdateApiKeyControllerOutput>(async () => {
      const data = await updateApiKeyController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

export const deleteApiKeyAction = superadminProcedure.createServerAction()
  .input(DeleteApiKeyActionSchema, { skipInputParsing: true })
  .handler(async ({ input }) => {
    return await runWithTransport<TDeleteApiKeyControllerOutput>(async () => {
      const data = await deleteApiKeyController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

export const deleteExpiredApiKeysAction = superadminProcedure.createServerAction()
  .input(DeleteExpiredApiKeysActionSchema, { skipInputParsing: true })
  .handler(async ({ input }) => {
    return await runWithTransport<TDeleteExpiredApiKeysControllerOutput>(
      async () => {
        const data = await deleteExpiredApiKeysController(input.payload);
        return { result: data, transport: input.transportOptions };
      },
    );
  });
