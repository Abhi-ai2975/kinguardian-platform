import {
  TUpdateHostValidationSchema,
  TUpdateHostResponseDtoSchema,
} from "@/modules/entities/schemas/admin/agent-auth/agent-auth.schema";
import { getInjection } from "@/modules/server/di/container";

export async function updateHostUseCase(
  payload: TUpdateHostValidationSchema,
): Promise<TUpdateHostResponseDtoSchema> {
  const service = getInjection("IAgentAuthService");
  return await service.updateHost(payload);
}
