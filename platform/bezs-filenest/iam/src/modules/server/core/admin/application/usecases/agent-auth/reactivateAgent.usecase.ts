import { TReactivateAgentValidationSchema } from "@/modules/entities/schemas/admin/agent-auth/agent-auth.schema";
import { getInjection } from "@/modules/server/di/container";

export async function reactivateAgentUseCase(
  payload: TReactivateAgentValidationSchema,
): Promise<{ success: boolean }> {
  const service = getInjection("IAgentAuthService");
  return await service.reactivateAgent(payload);
}
