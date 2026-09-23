/**
 * Fetch the full list of users from the auth system.
 * No pagination or filtering at this layer — the controller handles presentation.
 *
 * @returns All user records with their roles and status.
 * @layer Application
 */

import { TGetUsersResponseDtoSchema } from "@/modules/entities/schemas/admin/users/users.schema";
import { getInjection } from "@/modules/server/di/container";

export async function getUsersUseCase(): Promise<TGetUsersResponseDtoSchema> {
  const usersService = getInjection("IUsersService");
  const data = await usersService.getUsers();
  return data;
}
