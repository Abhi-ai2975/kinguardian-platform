import { RemoveTeamMemberValidationSchema } from "@/modules/entities/schemas/admin/organizations/organizations.schema";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { removeTeamMemberUseCase } from "../../../application/usecases/organizations/removeTeamMember.usecase";

function presenter(data: { success: boolean }) {
  return data;
}

export type TRemoveTeamMemberControllerOutput = ReturnType<typeof presenter>;

export async function removeTeamMemberController(input: unknown): Promise<TRemoveTeamMemberControllerOutput> {
  const parsed = await RemoveTeamMemberValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await removeTeamMemberUseCase(parsed.data);
  return presenter(data);
}
