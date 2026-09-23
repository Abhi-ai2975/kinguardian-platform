import { DeleteOrganizationValidationSchema } from "@/modules/entities/schemas/admin/organizations/organizations.schema";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { deleteOrganizationUseCase } from "../../../application/usecases/organizations/deleteOrganization.usecase";

function presenter(data: { success: boolean }) {
  return data;
}

export type TDeleteOrganizationControllerOutput = ReturnType<typeof presenter>;

export async function deleteOrganizationController(
  input: unknown,
): Promise<TDeleteOrganizationControllerOutput> {
  const parsed = await DeleteOrganizationValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await deleteOrganizationUseCase(parsed.data);
  return presenter(data);
}
