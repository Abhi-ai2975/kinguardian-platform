import {
  SetUserRoleValidationSchema,
  TUserSchema,
} from "@/modules/entities/schemas/admin/users/users.schema";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { setUserRoleUseCase } from "../../../application/usecases/users/setUserRole.usecase";

function presenter(data: TUserSchema) {
  return data;
}

export type TSetUserRoleControllerOutput = ReturnType<typeof presenter>;

export async function setUserRoleController(input: unknown): Promise<TSetUserRoleControllerOutput> {
  const parsed = await SetUserRoleValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await setUserRoleUseCase(parsed.data);
  return presenter(data);
}
