import { TListHostsResponseDtoSchema } from "@/modules/entities/schemas/admin/agent-auth/agent-auth.schema";
import { getInjection } from "@/modules/server/di/container";

export async function listHostsUseCase(): Promise<TListHostsResponseDtoSchema> {
  const service = getInjection("IAgentAuthService");
  return await service.listHosts();
}
