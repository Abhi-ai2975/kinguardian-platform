import { UpdateMemberRoleValidationSchema } from "@/modules/entities/schemas/admin/organizations/organizations.schema";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { updateMemberRoleUseCase } from "../../../application/usecases/organizations/updateMemberRole.usecase";

function presenter(data: { success: boolean }) {
  return data;
}

export type TUpdateMemberRoleControllerOutput = ReturnType<typeof presenter>;

export async function updateMemberRoleController(input: unknown): Promise<TUpdateMemberRoleControllerOutput> {
  const parsed = await UpdateMemberRoleValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await updateMemberRoleUseCase(parsed.data);
  return presenter(data);
}
