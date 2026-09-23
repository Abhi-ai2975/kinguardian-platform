import { CreateInvitationValidationSchema } from "@/modules/entities/schemas/admin/organizations/organizations.schema";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { createInvitationUseCase } from "../../../application/usecases/organizations/createInvitation.usecase";

function presenter(data: { success: boolean }) {
  return data;
}

export type TCreateInvitationControllerOutput = ReturnType<typeof presenter>;

export async function createInvitationController(input: unknown): Promise<TCreateInvitationControllerOutput> {
  const parsed = await CreateInvitationValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await createInvitationUseCase(parsed.data);
  return presenter(data);
}
