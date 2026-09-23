import {
  TUpdateAgentValidationSchema,
  TUpdateAgentResponseDtoSchema,
} from "@/modules/entities/schemas/admin/agent-auth/agent-auth.schema";
import { getInjection } from "@/modules/server/di/container";

export async function updateAgentUseCase(
  payload: TUpdateAgentValidationSchema,
): Promise<TUpdateAgentResponseDtoSchema> {
  const service = getInjection("IAgentAuthService");
  return await service.updateAgent(payload);
}
