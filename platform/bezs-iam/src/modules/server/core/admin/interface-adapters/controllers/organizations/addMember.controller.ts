import { AddMemberValidationSchema } from "@/modules/entities/schemas/admin/organizations/organizations.schema";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { addMemberUseCase } from "../../../application/usecases/organizations/addMember.usecase";

function presenter(data: { success: boolean }) {
  return data;
}

export type TAddMemberControllerOutput = ReturnType<typeof presenter>;

export async function addMemberController(input: unknown): Promise<TAddMemberControllerOutput> {
  const parsed = await AddMemberValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await addMemberUseCase(parsed.data);
  return presenter(data);
}
