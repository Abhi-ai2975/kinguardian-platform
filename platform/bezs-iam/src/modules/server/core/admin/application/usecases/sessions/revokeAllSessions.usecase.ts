import { getInjection } from "@/modules/server/di/container";

export async function revokeAllSessionsUseCase(): Promise<{ success: boolean; count: number }> {
  const sessionsRepository = getInjection("ISessionsRepository");
  return await sessionsRepository.revokeAllSessions();
}
