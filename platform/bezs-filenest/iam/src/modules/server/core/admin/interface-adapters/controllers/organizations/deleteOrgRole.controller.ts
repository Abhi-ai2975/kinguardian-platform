import { DeleteOrgRoleValidationSchema } from "@/modules/entities/schemas/admin/organizations/organizations.schema";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { deleteOrgRoleUseCase } from "../../../application/usecases/organizations/deleteOrgRole.usecase";

function presenter(data: { success: boolean }): { success: boolean } {
  return data;
}

export type TDeleteOrgRoleControllerOutput = ReturnType<typeof presenter>;

export async function deleteOrgRoleController(
  input: unknown,
): Promise<TDeleteOrgRoleControllerOutput> {
  const parsed = await DeleteOrgRoleValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await deleteOrgRoleUseCase(parsed.data);
  return presenter(data);
}
