import { TSetUserRoleValidationSchema, TUserSchema } from "@/modules/entities/schemas/admin/users/users.schema";
import { getInjection } from "@/modules/server/di/container";

export async function setUserRoleUseCase(payload: TSetUserRoleValidationSchema): Promise<TUserSchema> {
  const usersService = getInjection("IUsersService");
  return await usersService.setUserRole(payload);
}
