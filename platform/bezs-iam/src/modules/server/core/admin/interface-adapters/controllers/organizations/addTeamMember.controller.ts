import { AddTeamMemberValidationSchema } from "@/modules/entities/schemas/admin/organizations/organizations.schema";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { addTeamMemberUseCase } from "../../../application/usecases/organizations/addTeamMember.usecase";

function presenter(data: { success: boolean }) {
  return data;
}

export type TAddTeamMemberControllerOutput = ReturnType<typeof presenter>;

export async function addTeamMemberController(input: unknown): Promise<TAddTeamMemberControllerOutput> {
  const parsed = await AddTeamMemberValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await addTeamMemberUseCase(parsed.data);
  return presenter(data);
}
