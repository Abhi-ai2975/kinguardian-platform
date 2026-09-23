import { TListAgentsResponseDtoSchema } from "@/modules/entities/schemas/admin/agent-auth/agent-auth.schema";
import { getInjection } from "@/modules/server/di/container";

export async function listAgentsUseCase(): Promise<TListAgentsResponseDtoSchema> {
  const service = getInjection("IAgentAuthService");
  return await service.listAgents();
}
