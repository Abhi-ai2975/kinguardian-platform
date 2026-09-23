import {
  TGrantCapabilityValidationSchema,
  TGrantCapabilityResponseDtoSchema,
} from "@/modules/entities/schemas/admin/agent-auth/agent-auth.schema";
import { getInjection } from "@/modules/server/di/container";

export async function grantAgentCapabilityUseCase(
  payload: TGrantCapabilityValidationSchema,
): Promise<TGrantCapabilityResponseDtoSchema> {
  const service = getInjection("IAgentAuthService");
  return await service.grantCapability(payload);
}
