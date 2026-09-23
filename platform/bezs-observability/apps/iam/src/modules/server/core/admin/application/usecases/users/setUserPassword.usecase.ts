import { TSetUserPasswordValidationSchema } from "@/modules/entities/schemas/admin/users/users.schema";
import { getInjection } from "@/modules/server/di/container";

export async function setUserPasswordUseCase(
  payload: TSetUserPasswordValidationSchema,
): Promise<{ status: boolean }> {
  const usersService = getInjection("IUsersService");
  return await usersService.setUserPassword(payload);
}
