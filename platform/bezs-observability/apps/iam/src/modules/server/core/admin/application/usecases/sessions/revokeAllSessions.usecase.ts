import { getInjection } from "@/modules/server/di/container";

export async function revokeAllSessionsUseCase(): Promise<{ success: boolean; count: number }> {
  const sessionsService = getInjection("ISessionsService");
  return await sessionsService.revokeAllSessions();
}
