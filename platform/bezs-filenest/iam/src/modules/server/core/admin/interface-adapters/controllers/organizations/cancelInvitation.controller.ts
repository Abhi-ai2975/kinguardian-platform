import { CancelInvitationValidationSchema } from "@/modules/entities/schemas/admin/organizations/organizations.schema";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { cancelInvitationUseCase } from "../../../application/usecases/organizations/cancelInvitation.usecase";

function presenter(data: { success: boolean }) {
  return data;
}

export type TCancelInvitationControllerOutput = ReturnType<typeof presenter>;

export async function cancelInvitationController(input: unknown): Promise<TCancelInvitationControllerOutput> {
  const parsed = await CancelInvitationValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await cancelInvitationUseCase(parsed.data);
  return presenter(data);
}
