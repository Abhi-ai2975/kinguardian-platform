import {
  UpdateOrgRoleValidationSchema,
  TOrgRoleSchema,
} from "@/modules/entities/schemas/admin/organizations/organizations.schema";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { updateOrgRoleUseCase } from "../../../application/usecases/organizations/updateOrgRole.usecase";

function presenter(data: TOrgRoleSchema): TOrgRoleSchema {
  return data;
}

export type TUpdateOrgRoleControllerOutput = ReturnType<typeof presenter>;

export async function updateOrgRoleController(
  input: unknown,
): Promise<TUpdateOrgRoleControllerOutput> {
  const parsed = await UpdateOrgRoleValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await updateOrgRoleUseCase(parsed.data);
  return presenter(data);
}
