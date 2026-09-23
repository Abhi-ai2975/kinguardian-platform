import { RevokeUserSessionsValidationSchema } from "@/modules/entities/schemas/admin/users/users.schema";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { revokeUserSessionsUseCase } from "../../../application/usecases/users/revokeUserSessions.usecase";

function presenter(data: { success: boolean }) {
  return data;
}

export type TRevokeUserSessionsControllerOutput = ReturnType<typeof presenter>;

export async function revokeUserSessionsController(
  input: unknown,
): Promise<TRevokeUserSessionsControllerOutput> {
  const parsed = await RevokeUserSessionsValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await revokeUserSessionsUseCase(parsed.data);
  return presenter(data);
}
