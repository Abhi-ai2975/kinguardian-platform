import { TCleanupAgentsResponseDtoSchema } from "@/modules/entities/schemas/admin/agent-auth/agent-auth.schema";
import { cleanupAgentsUseCase } from "../../../application/usecases/agent-auth";

function presenter(data: TCleanupAgentsResponseDtoSchema) {
  return data;
}

export type TCleanupAgentsControllerOutput = ReturnType<typeof presenter>;

export async function cleanupAgentsController(): Promise<TCleanupAgentsControllerOutput> {
  const data = await cleanupAgentsUseCase();
  return presenter(data);
}
