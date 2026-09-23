import { TBanUserValidationSchema, TUserSchema } from "@/modules/entities/schemas/admin/users/users.schema";
import { getInjection } from "@/modules/server/di/container";

export async function banUserUseCase(payload: TBanUserValidationSchema): Promise<TUserSchema> {
  const usersService = getInjection("IUsersService");
  return await usersService.banUser(payload);
}
