import { RevokeAgentValidationSchema } from "@/modules/entities/schemas/admin/agent-auth/agent-auth.schema";
import { revokeAgentUseCase } from "../../../application/usecases/agent-auth";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";

function presenter(data: { success: boolean }) {
  return data;
}

export type TRevokeAgentControllerOutput = ReturnType<typeof presenter>;

export async function revokeAgentController(
  input: unknown,
): Promise<TRevokeAgentControllerOutput> {
  const parsed = await RevokeAgentValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);

  const data = await revokeAgentUseCase(parsed.data);
  return presenter(data);
}
