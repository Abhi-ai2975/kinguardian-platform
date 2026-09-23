import { TListPendingApprovalsResponseDtoSchema } from "@/modules/entities/schemas/admin/agent-auth/agent-auth.schema";
import { listPendingApprovalsUseCase } from "../../../application/usecases/agent-auth";

function presenter(data: TListPendingApprovalsResponseDtoSchema) {
  return data.requests;
}

export type TListPendingApprovalsControllerOutput = ReturnType<
  typeof presenter
>;

export async function listPendingApprovalsController(): Promise<TListPendingApprovalsControllerOutput> {
  const data = await listPendingApprovalsUseCase();
  return presenter(data);
}
