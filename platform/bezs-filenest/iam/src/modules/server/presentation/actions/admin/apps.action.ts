"use server";

import { superadminProcedure } from "../procedures";
import { runWithTransport } from "../../transport/runWithTransport";
import {
  listAppsController,
  TListAppsControllerOutput,
  createAppController,
  TCreateAppControllerOutput,
  updateAppController,
  TUpdateAppControllerOutput,
  deleteAppController,
  TDeleteAppControllerOutput,
  listMenuNodesController,
  TListMenuNodesControllerOutput,
  createMenuNodeController,
  TCreateMenuNodeControllerOutput,
  updateMenuNodeController,
  TUpdateMenuNodeControllerOutput,
  deleteMenuNodeController,
  TDeleteMenuNodeControllerOutput,
  reorderMenuNodeController,
  TReorderMenuNodeControllerOutput,
  listActionsController,
  TListActionsControllerOutput,
} from "@/modules/server/core/admin/interface-adapters/controllers/apps";
import {
  CreateAppActionSchema,
  UpdateAppActionSchema,
  DeleteAppActionSchema,
  CreateMenuNodeActionSchema,
  UpdateMenuNodeActionSchema,
  DeleteMenuNodeActionSchema,
  ReorderMenuNodeActionSchema,
} from "@/modules/entities/schemas/admin/apps/apps.schema";
import z from "zod";

// ---------------------------------------------------------- //
// App query actions
// ---------------------------------------------------------- //

export const listAppsAction = superadminProcedure.createServerAction().handler(async () => {
  return await runWithTransport<TListAppsControllerOutput>(async () => {
    const data = await listAppsController();
    return { result: data };
  });
});

// ---------------------------------------------------------- //
// App mutation actions
// ---------------------------------------------------------- //

export const createAppAction = superadminProcedure.createServerAction()
  .input(CreateAppActionSchema, { skipInputParsing: true })
  .handler(async ({ input }) => {
    return await runWithTransport<TCreateAppControllerOutput>(async () => {
      const data = await createAppController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

export const updateAppAction = superadminProcedure.createServerAction()
  .input(UpdateAppActionSchema, { skipInputParsing: true })
  .handler(async ({ input }) => {
    return await runWithTransport<TUpdateAppControllerOutput>(async () => {
      const data = await updateAppController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

export const deleteAppAction = superadminProcedure.createServerAction()
  .input(DeleteAppActionSchema, { skipInputParsing: true })
  .handler(async ({ input }) => {
    return await runWithTransport<TDeleteAppControllerOutput>(async () => {
      const data = await deleteAppController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

// ---------------------------------------------------------- //
// MenuNode query actions
// ---------------------------------------------------------- //

export const listMenuNodesAction = superadminProcedure.createServerAction()
  .input(z.object({ appId: z.string() }))
  .handler(async ({ input }) => {
    return await runWithTransport<TListMenuNodesControllerOutput>(async () => {
      const data = await listMenuNodesController(input.appId);
      return { result: data };
    });
  });

export const listActionsAction = superadminProcedure.createServerAction().handler(async () => {
  return await runWithTransport<TListActionsControllerOutput>(async () => {
    const data = await listActionsController();
    return { result: data };
  });
});

// ---------------------------------------------------------- //
// MenuNode mutation actions
// ---------------------------------------------------------- //

export const createMenuNodeAction = superadminProcedure.createServerAction()
  .input(CreateMenuNodeActionSchema, { skipInputParsing: true })
  .handler(async ({ input }) => {
    return await runWithTransport<TCreateMenuNodeControllerOutput>(async () => {
      const data = await createMenuNodeController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

export const updateMenuNodeAction = superadminProcedure.createServerAction()
  .input(UpdateMenuNodeActionSchema, { skipInputParsing: true })
  .handler(async ({ input }) => {
    return await runWithTransport<TUpdateMenuNodeControllerOutput>(async () => {
      const data = await updateMenuNodeController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

export const deleteMenuNodeAction = superadminProcedure.createServerAction()
  .input(DeleteMenuNodeActionSchema, { skipInputParsing: true })
  .handler(async ({ input }) => {
    return await runWithTransport<TDeleteMenuNodeControllerOutput>(async () => {
      const data = await deleteMenuNodeController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

export const reorderMenuNodeAction = superadminProcedure.createServerAction()
  .input(ReorderMenuNodeActionSchema, { skipInputParsing: true })
  .handler(async ({ input }) => {
    return await runWithTransport<TReorderMenuNodeControllerOutput>(
      async () => {
        const data = await reorderMenuNodeController(input.payload);
        return { result: data, transport: input.transportOptions };
      },
    );
  });
