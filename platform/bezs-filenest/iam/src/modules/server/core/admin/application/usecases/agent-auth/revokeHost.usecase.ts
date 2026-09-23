import { TRevokeHostValidationSchema } from "@/modules/entities/schemas/admin/agent-auth/agent-auth.schema";
import { getInjection } from "@/modules/server/di/container";

export async function revokeHostUseCase(
  payload: TRevokeHostValidationSchema,
): Promise<{ success: boolean }> {
  const service = getInjection("IAgentAuthService");
  return await service.revokeHost(payload);
}
