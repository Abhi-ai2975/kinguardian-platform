"use server";

import { superadminProcedure } from "../procedures";
import { runWithTransport } from "../../transport/runWithTransport";
import {
  listResourcesController,
  TListResourcesControllerOutput,
  createResourceController,
  TCreateResourceControllerOutput,
  updateResourceController,
  TUpdateResourceControllerOutput,
  deleteResourceController,
  TDeleteResourceControllerOutput,
  listResourceActionsController,
  TListResourceActionsControllerOutput,
  createResourceActionController,
  TCreateResourceActionControllerOutput,
  updateResourceActionController,
  TUpdateResourceActionControllerOutput,
  deleteResourceActionController,
  TDeleteResourceActionControllerOutput,
} from "@/modules/server/core/admin/interface-adapters/controllers/resources";
import {
  CreateResourceInput,
  UpdateResourceInput,
  DeleteResourceInput,
  CreateResourceActionInput,
  UpdateResourceActionInput,
  DeleteResourceActionInput,
} from "@/modules/entities/schemas/admin/resources/resources.schema";
import z from "zod";

// ------------------------------------------------------------------ //
// Resource actions
// ------------------------------------------------------------------ //

export const listResourcesAction = superadminProcedure.createServerAction().handler(async () => {
  return await runWithTransport<TListResourcesControllerOutput>(async () => {
    const data = await listResourcesController();
    return { result: data };
  });
});

export const createResourceAction = superadminProcedure.createServerAction()
  .input(CreateResourceInput, { skipInputParsing: true })
  .handler(async ({ input }) => {
    return await runWithTransport<TCreateResourceControllerOutput>(async () => {
      const data = await createResourceController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

export const updateResourceAction = superadminProcedure.createServerAction()
  .input(UpdateResourceInput, { skipInputParsing: true })
  .handler(async ({ input }) => {
    return await runWithTransport<TUpdateResourceControllerOutput>(async () => {
      const data = await updateResourceController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

export const deleteResourceAction = superadminProcedure.createServerAction()
  .input(DeleteResourceInput, { skipInputParsing: true })
  .handler(async ({ input }) => {
    return await runWithTransport<TDeleteResourceControllerOutput>(async () => {
      const data = await deleteResourceController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

// ------------------------------------------------------------------ //
// ResourceAction actions
// ------------------------------------------------------------------ //

export const listResourceActionsAction = superadminProcedure.createServerAction()
  .input(z.object({ resourceId: z.string().optional() }).optional())
  .handler(async ({ input }) => {
    return await runWithTransport<TListResourceActionsControllerOutput>(
      async () => {
        const data = await listResourceActionsController(input?.resourceId);
        return { result: data };
      },
    );
  });

export const createResourceActionAction = superadminProcedure.createServerAction()
  .input(CreateResourceActionInput, { skipInputParsing: true })
  .handler(async ({ input }) => {
    return await runWithTransport<TCreateResourceActionControllerOutput>(
      async () => {
        const data = await createResourceActionController(input.payload);
        return { result: data, transport: input.transportOptions };
      },
    );
  });

export const updateResourceActionAction = superadminProcedure.createServerAction()
  .input(UpdateResourceActionInput, { skipInputParsing: true })
  .handler(async ({ input }) => {
    return await runWithTransport<TUpdateResourceActionControllerOutput>(
      async () => {
        const data = await updateResourceActionController(input.payload);
        return { result: data, transport: input.transportOptions };
      },
    );
  });

export const deleteResourceActionAction = superadminProcedure.createServerAction()
  .input(DeleteResourceActionInput, { skipInputParsing: true })
  .handler(async ({ input }) => {
    return await runWithTransport<TDeleteResourceActionControllerOutput>(
      async () => {
        const data = await deleteResourceActionController(input.payload);
        return { result: data, transport: input.transportOptions };
      },
    );
  });
