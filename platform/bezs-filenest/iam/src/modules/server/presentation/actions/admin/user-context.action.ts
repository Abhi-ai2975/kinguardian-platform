"use server";

import { superadminProcedure } from "../procedures";
import { runWithTransport } from "../../transport/runWithTransport";
import {
  listUserContextsController,
  TListUserContextsControllerOutput,
  getUserOrgMembershipsController,
  TGetUserOrgMembershipsControllerOutput,
  getOrgRolesForContextController,
  TGetOrgRolesForContextControllerOutput,
  setUserContextController,
  TSetUserContextControllerOutput,
} from "@/modules/server/core/admin/interface-adapters/controllers/usercontext";
import { SetUserContextActionSchema } from "@/modules/entities/schemas/admin/user-context/user-context.schema";
import z from "zod";

export const listUserContextsAction = superadminProcedure
  .createServerAction()
  .handler(async () => {
    return await runWithTransport<TListUserContextsControllerOutput>(async () => {
      const data = await listUserContextsController();
      return { result: data };
    });
  });

export const getUserOrgMembershipsAction = superadminProcedure
  .createServerAction()
  .input(z.object({ userId: z.string() }))
  .handler(async ({ input }) => {
    return await runWithTransport<TGetUserOrgMembershipsControllerOutput>(async () => {
      const data = await getUserOrgMembershipsController(input.userId);
      return { result: data };
    });
  });

export const getOrgRolesForContextAction = superadminProcedure
  .createServerAction()
  .input(z.object({ organizationId: z.string() }))
  .handler(async ({ input }) => {
    return await runWithTransport<TGetOrgRolesForContextControllerOutput>(async () => {
      const data = await getOrgRolesForContextController(input.organizationId);
      return { result: data };
    });
  });

export const setUserContextAction = superadminProcedure
  .createServerAction()
  .input(SetUserContextActionSchema, { skipInputParsing: true })
  .handler(async ({ input }) => {
    return await runWithTransport<TSetUserContextControllerOutput>(async () => {
      const data = await setUserContextController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });
