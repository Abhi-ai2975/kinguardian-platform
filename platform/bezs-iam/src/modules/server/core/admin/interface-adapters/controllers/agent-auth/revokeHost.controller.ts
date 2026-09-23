import { RevokeHostValidationSchema } from "@/modules/entities/schemas/admin/agent-auth/agent-auth.schema";
import { revokeHostUseCase } from "../../../application/usecases/agent-auth";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";

function presenter(data: { success: boolean }) {
  return data;
}

export type TRevokeHostControllerOutput = ReturnType<typeof presenter>;

export async function revokeHostController(
  input: unknown,
): Promise<TRevokeHostControllerOutput> {
  const parsed = await RevokeHostValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);

  const data = await revokeHostUseCase(parsed.data);
  return presenter(data);
}
