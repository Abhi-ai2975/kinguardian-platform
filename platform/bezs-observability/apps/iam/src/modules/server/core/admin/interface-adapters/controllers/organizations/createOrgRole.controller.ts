import {
  CreateOrgRoleValidationSchema,
  TOrgRoleSchema,
} from "@/modules/entities/schemas/admin/organizations/organizations.schema";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { createOrgRoleUseCase } from "../../../application/usecases/organizations/createOrgRole.usecase";

function presenter(data: TOrgRoleSchema): TOrgRoleSchema {
  return data;
}

export type TCreateOrgRoleControllerOutput = ReturnType<typeof presenter>;

export async function createOrgRoleController(
  input: unknown,
): Promise<TCreateOrgRoleControllerOutput> {
  const parsed = await CreateOrgRoleValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await createOrgRoleUseCase(parsed.data);
  return presenter(data);
}
