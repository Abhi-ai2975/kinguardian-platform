import { ReactivateAgentValidationSchema } from "@/modules/entities/schemas/admin/agent-auth/agent-auth.schema";
import { reactivateAgentUseCase } from "../../../application/usecases/agent-auth";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";

function presenter(data: { success: boolean }) {
  return data;
}

export type TReactivateAgentControllerOutput = ReturnType<typeof presenter>;

export async function reactivateAgentController(
  input: unknown,
): Promise<TReactivateAgentControllerOutput> {
  const parsed = await ReactivateAgentValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);

  const data = await reactivateAgentUseCase(parsed.data);
  return presenter(data);
}
