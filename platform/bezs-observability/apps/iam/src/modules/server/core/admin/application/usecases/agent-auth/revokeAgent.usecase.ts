import { TRevokeAgentValidationSchema } from "@/modules/entities/schemas/admin/agent-auth/agent-auth.schema";
import { getInjection } from "@/modules/server/di/container";

export async function revokeAgentUseCase(
  payload: TRevokeAgentValidationSchema,
): Promise<{ success: boolean }> {
  const service = getInjection("IAgentAuthService");
  return await service.revokeAgent(payload);
}
