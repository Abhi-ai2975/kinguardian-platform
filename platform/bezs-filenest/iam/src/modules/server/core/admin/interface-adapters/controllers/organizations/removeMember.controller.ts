import { RemoveMemberValidationSchema } from "@/modules/entities/schemas/admin/organizations/organizations.schema";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { removeMemberUseCase } from "../../../application/usecases/organizations/removeMember.usecase";

function presenter(data: { success: boolean }) {
  return data;
}

export type TRemoveMemberControllerOutput = ReturnType<typeof presenter>;

export async function removeMemberController(input: unknown): Promise<TRemoveMemberControllerOutput> {
  const parsed = await RemoveMemberValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await removeMemberUseCase(parsed.data);
  return presenter(data);
}
