/**
 * @module admin/users/getUsers.controller
 * @description Controller for listing all users. No input validation needed
 *              (read-only operation). The presenter strips the pagination
 *              wrapper, returning a flat array of users.
 *
 * **Data flow:** Server Action → runWithTransport → getUsersController → getUsersUseCase
 * @category Controller
 * @layer Interface Adapters
 */

import { TUserSchema } from "@/modules/entities/schemas/admin/users/users.schema";
import { getUsersUseCase } from "../../../application/usecases/users/getUsers.usecase";

function presenter(data: { users: TUserSchema[]; total: number }): TUserSchema[] {
  return data.users;
}

export type TGetUsersControllerOutput = ReturnType<typeof presenter>;

export async function getUsersController(): Promise<TGetUsersControllerOutput> {
  const data = await getUsersUseCase();
  return presenter(data);
}
