import { TRevokeSessionValidationSchema } from "@/modules/entities/schemas/admin/sessions/sessions.schema";
import { getInjection } from "@/modules/server/di/container";

export async function revokeSessionUseCase(
  payload: TRevokeSessionValidationSchema,
): Promise<{ success: boolean }> {
  const sessionsService = getInjection("ISessionsService");
  return await sessionsService.revokeUserSession(payload);
}
