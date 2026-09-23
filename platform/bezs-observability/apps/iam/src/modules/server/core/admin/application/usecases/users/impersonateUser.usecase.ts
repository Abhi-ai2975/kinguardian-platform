import { TUserSchema } from "@/modules/entities/schemas/admin/users/users.schema";
import { getInjection } from "@/modules/server/di/container";

export async function impersonateUserUseCase(payload: {
  userId: string;
}): Promise<{ session: unknown; user: TUserSchema }> {
  const usersService = getInjection("IUsersService");
  return await usersService.impersonateUser(payload);
}
