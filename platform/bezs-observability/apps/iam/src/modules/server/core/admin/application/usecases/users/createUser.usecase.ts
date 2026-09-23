import { TCreateUserValidationSchema, TUserSchema } from "@/modules/entities/schemas/admin/users/users.schema";
import { getInjection } from "@/modules/server/di/container";

export async function createUserUseCase(payload: TCreateUserValidationSchema): Promise<TUserSchema> {
  const usersService = getInjection("IUsersService");
  return await usersService.createUser(payload);
}
