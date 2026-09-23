import { TApproveCapabilityValidationSchema } from "@/modules/entities/schemas/admin/agent-auth/agent-auth.schema";
import { getInjection } from "@/modules/server/di/container";

export async function approveCapabilityUseCase(
  payload: TApproveCapabilityValidationSchema,
): Promise<{ success: boolean }> {
  const service = getInjection("IAgentAuthService");
  return await service.approveCapability(payload);
}
