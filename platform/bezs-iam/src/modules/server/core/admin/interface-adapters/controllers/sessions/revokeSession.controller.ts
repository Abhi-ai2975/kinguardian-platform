import { RevokeSessionValidationSchema } from "@/modules/entities/schemas/admin/sessions/sessions.schema";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { revokeSessionUseCase } from "../../../application/usecases/sessions/revokeSession.usecase";

function presenter(data: { success: boolean }) {
  return data;
}

export type TRevokeSessionControllerOutput = ReturnType<typeof presenter>;

export async function revokeSessionController(
  input: unknown,
): Promise<TRevokeSessionControllerOutput> {
  const parsed = await RevokeSessionValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await revokeSessionUseCase(parsed.data);
  return presenter(data);
}
