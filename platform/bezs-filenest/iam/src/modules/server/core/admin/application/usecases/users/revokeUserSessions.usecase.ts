import { getInjection } from "@/modules/server/di/container";

export async function revokeUserSessionsUseCase(payload: { userId: string }): Promise<{ success: boolean }> {
  const usersService = getInjection("IUsersService");
  return await usersService.revokeUserSessions(payload);
}
