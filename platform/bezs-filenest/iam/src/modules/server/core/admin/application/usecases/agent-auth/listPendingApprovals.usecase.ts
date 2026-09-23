import { TListPendingApprovalsResponseDtoSchema } from "@/modules/entities/schemas/admin/agent-auth/agent-auth.schema";
import { getInjection } from "@/modules/server/di/container";

export async function listPendingApprovalsUseCase(): Promise<TListPendingApprovalsResponseDtoSchema> {
  const service = getInjection("IAgentAuthService");
  return await service.listPendingApprovals();
}
