import { TCleanupAgentsResponseDtoSchema } from "@/modules/entities/schemas/admin/agent-auth/agent-auth.schema";
import { getInjection } from "@/modules/server/di/container";

export async function cleanupAgentsUseCase(): Promise<TCleanupAgentsResponseDtoSchema> {
  const service = getInjection("IAgentAuthService");
  return await service.cleanupAgents();
}
