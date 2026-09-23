import { TUserSchema } from "@/modules/entities/schemas/admin/users/users.schema";
import { getInjection } from "@/modules/server/di/container";

export async function unbanUserUseCase(payload: { userId: string }): Promise<TUserSchema> {
  const usersService = getInjection("IUsersService");
  return await usersService.unbanUser(payload);
}
