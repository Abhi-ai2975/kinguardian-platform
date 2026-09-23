"use server";

import { superadminProcedure } from "../procedures";
import { runWithTransport } from "../../transport/runWithTransport";
import {
  getUsersController,
  TGetUsersControllerOutput,
  createUserController,
  TCreateUserControllerOutput,
  updateUserController,
  TUpdateUserControllerOutput,
  setUserRoleController,
  TSetUserRoleControllerOutput,
  banUserController,
  TBanUserControllerOutput,
  unbanUserController,
  TUnbanUserControllerOutput,
  removeUserController,
  TRemoveUserControllerOutput,
  setUserPasswordController,
  TSetUserPasswordControllerOutput,
  revokeUserSessionsController,
  TRevokeUserSessionsControllerOutput,
  impersonateUserController,
  TImpersonateUserControllerOutput,
} from "@/modules/server/core/admin/interface-adapters/controllers/users";
import {
  CreateUserActionSchema,
  UpdateUserActionSchema,
  SetUserRoleActionSchema,
  BanUserActionSchema,
  UnbanUserActionSchema,
  RemoveUserActionSchema,
  SetUserPasswordActionSchema,
  RevokeUserSessionsActionSchema,
  ImpersonateUserActionSchema,
} from "@/modules/entities/schemas/admin/users/users.schema";

export const getUsersAction = superadminProcedure.createServerAction().handler(async () => {
  return await runWithTransport<TGetUsersControllerOutput>(async () => {
    const data = await getUsersController();
    return { result: data };
  });
});

export const createUserAction = superadminProcedure.createServerAction()
  .input(CreateUserActionSchema, { skipInputParsing: true })
  .handler(async ({ input }) => {
    return await runWithTransport<TCreateUserControllerOutput>(async () => {
      const data = await createUserController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

export const updateUserAction = superadminProcedure.createServerAction()
  .input(UpdateUserActionSchema, { skipInputParsing: true })
  .handler(async ({ input }) => {
    return await runWithTransport<TUpdateUserControllerOutput>(async () => {
      const data = await updateUserController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

export const setUserRoleAction = superadminProcedure.createServerAction()
  .input(SetUserRoleActionSchema, { skipInputParsing: true })
  .handler(async ({ input }) => {
    return await runWithTransport<TSetUserRoleControllerOutput>(async () => {
      const data = await setUserRoleController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

export const banUserAction = superadminProcedure.createServerAction()
  .input(BanUserActionSchema, { skipInputParsing: true })
  .handler(async ({ input }) => {
    return await runWithTransport<TBanUserControllerOutput>(async () => {
      const data = await banUserController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

export const unbanUserAction = superadminProcedure.createServerAction()
  .input(UnbanUserActionSchema, { skipInputParsing: true })
  .handler(async ({ input }) => {
    return await runWithTransport<TUnbanUserControllerOutput>(async () => {
      const data = await unbanUserController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

export const removeUserAction = superadminProcedure.createServerAction()
  .input(RemoveUserActionSchema, { skipInputParsing: true })
  .handler(async ({ input }) => {
    return await runWithTransport<TRemoveUserControllerOutput>(async () => {
      const data = await removeUserController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

export const setUserPasswordAction = superadminProcedure.createServerAction()
  .input(SetUserPasswordActionSchema, { skipInputParsing: true })
  .handler(async ({ input }) => {
    return await runWithTransport<TSetUserPasswordControllerOutput>(async () => {
      const data = await setUserPasswordController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

export const revokeUserSessionsAction = superadminProcedure.createServerAction()
  .input(RevokeUserSessionsActionSchema, { skipInputParsing: true })
  .handler(async ({ input }) => {
    return await runWithTransport<TRevokeUserSessionsControllerOutput>(async () => {
      const data = await revokeUserSessionsController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

export const impersonateUserAction = superadminProcedure.createServerAction()
  .input(ImpersonateUserActionSchema, { skipInputParsing: true })
  .handler(async ({ input }) => {
    return await runWithTransport<TImpersonateUserControllerOutput>(async () => {
      const data = await impersonateUserController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });
