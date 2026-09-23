import { TGetUsersResponseDtoSchema } from "@/modules/entities/schemas/admin/users/users.schema";
import { getInjection } from "@/modules/server/di/container";

export async function getUsersUseCase(): Promise<TGetUsersResponseDtoSchema> {
  const usersService = getInjection("IUsersService");
  const data = await usersService.getUsers();
  return data;
}
