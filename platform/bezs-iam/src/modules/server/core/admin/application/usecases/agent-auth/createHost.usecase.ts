import {
  TCreateHostValidationSchema,
  TCreateHostResponseDtoSchema,
} from "@/modules/entities/schemas/admin/agent-auth/agent-auth.schema";
import { getInjection } from "@/modules/server/di/container";

export async function createHostUseCase(
  payload: TCreateHostValidationSchema,
): Promise<TCreateHostResponseDtoSchema> {
  const service = getInjection("IAgentAuthService");
  return await service.createHost(payload);
}
