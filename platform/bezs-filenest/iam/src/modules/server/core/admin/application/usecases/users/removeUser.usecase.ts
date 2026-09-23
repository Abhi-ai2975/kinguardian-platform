import { getInjection } from "@/modules/server/di/container";

export async function removeUserUseCase(payload: { userId: string }): Promise<{ success: boolean }> {
  const usersService = getInjection("IUsersService");
  return await usersService.removeUser(payload);
}
