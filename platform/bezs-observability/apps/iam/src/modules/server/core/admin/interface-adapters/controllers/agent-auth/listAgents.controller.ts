import { TListAgentsResponseDtoSchema } from "@/modules/entities/schemas/admin/agent-auth/agent-auth.schema";
import { listAgentsUseCase } from "../../../application/usecases/agent-auth";

function presenter(data: TListAgentsResponseDtoSchema) {
  return data.agents;
}

export type TListAgentsControllerOutput = ReturnType<typeof presenter>;

export async function listAgentsController(): Promise<TListAgentsControllerOutput> {
  const data = await listAgentsUseCase();
  return presenter(data);
}
