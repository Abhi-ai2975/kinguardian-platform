import {
  TUpdateUserValidationSchema,
  TUserSchema,
} from "@/modules/entities/schemas/admin/users/users.schema";
import { getInjection } from "@/modules/server/di/container";

export async function updateUserUseCase(
  payload: TUpdateUserValidationSchema,
): Promise<TUserSchema> {
  const usersService = getInjection("IUsersService");
  return await usersService.updateUser(payload);
}
