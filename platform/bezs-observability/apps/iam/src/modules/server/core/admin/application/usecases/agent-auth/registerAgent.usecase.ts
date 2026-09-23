import {
  TRegisterAgentValidationSchema,
  TRegisterAgentResponseDtoSchema,
} from "@/modules/entities/schemas/admin/agent-auth/agent-auth.schema";
import { getInjection } from "@/modules/server/di/container";

export async function registerAgentUseCase(
  payload: TRegisterAgentValidationSchema,
): Promise<TRegisterAgentResponseDtoSchema> {
  const service = getInjection("IAgentAuthService");
  return await service.registerAgent(payload);
}
