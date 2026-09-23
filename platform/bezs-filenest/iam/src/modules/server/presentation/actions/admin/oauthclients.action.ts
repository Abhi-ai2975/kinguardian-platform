"use server";

import { superadminProcedure } from "../procedures";
import { runWithTransport } from "../../transport/runWithTransport";
import {
  CreateOAuthClientActionSchema,
  UpdateOAuthClientActionSchema,
  DeleteOAuthClientActionSchema,
  RotateClientSecretActionSchema,
} from "@/modules/entities/schemas/admin/oauthclient/oauthclient.schema";
import {
  createOAuthClientController,
  getOAuthClientsController,
  updateOAuthClientController,
  deleteOAuthClientController,
  rotateClientSecretController,
  TCreateOAuthClientControllerOutput,
  TGetOAuthClientsControllerOutput,
  TUpdateOAuthClientControllerOutput,
  TDeleteOAuthClientControllerOutput,
  TRotateClientSecretControllerOutput,
} from "@/modules/server/core/admin/interface-adapters/controllers/oauthclient";
import { refreshOAuthClientOrigins } from "@/modules/server/auth-provider/oauth-client-origins";

export const getOAuthClientsAction = superadminProcedure.createServerAction().handler(async () => {
  return await runWithTransport<TGetOAuthClientsControllerOutput>(async () => {
    const data = await getOAuthClientsController();
    return { result: data };
  });
});

export const createOAuthClientAction = superadminProcedure.createServerAction()
  .input(CreateOAuthClientActionSchema, { skipInputParsing: true })
  .handler(async ({ input }) => {
    return await runWithTransport<TCreateOAuthClientControllerOutput>(
      async () => {
        const data = await createOAuthClientController(input.payload);
        void refreshOAuthClientOrigins();
        return { result: data, transport: input.transportOptions };
      },
    );
  });

export const updateOAuthClientAction = superadminProcedure.createServerAction()
  .input(UpdateOAuthClientActionSchema, { skipInputParsing: true })
  .handler(async ({ input }) => {
    return await runWithTransport<TUpdateOAuthClientControllerOutput>(
      async () => {
        const data = await updateOAuthClientController(input.payload);
        void refreshOAuthClientOrigins();
        return { result: data, transport: input.transportOptions };
      },
    );
  });

export const deleteOAuthClientAction = superadminProcedure.createServerAction()
  .input(DeleteOAuthClientActionSchema, { skipInputParsing: true })
  .handler(async ({ input }) => {
    return await runWithTransport<TDeleteOAuthClientControllerOutput>(
      async () => {
        const data = await deleteOAuthClientController(input.payload);
        void refreshOAuthClientOrigins();
        return { result: data, transport: input.transportOptions };
      },
    );
  });

export const rotateClientSecretAction = superadminProcedure.createServerAction()
  .input(RotateClientSecretActionSchema, { skipInputParsing: true })
  .handler(async ({ input }) => {
    return await runWithTransport<TRotateClientSecretControllerOutput>(
      async () => {
        const data = await rotateClientSecretController(input.payload);
        return { result: data, transport: input.transportOptions };
      },
    );
  });
