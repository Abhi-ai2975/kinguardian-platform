import {
  UpdateUserValidationSchema,
  TUserSchema,
} from "@/modules/entities/schemas/admin/users/users.schema";
import { updateUserUseCase } from "../../../application/usecases/users/updateUser.usecase";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";

function presenter(data: TUserSchema) {
  return data;
}

export type TUpdateUserControllerOutput = ReturnType<typeof presenter>;

export async function updateUserController(
  input: unknown,
): Promise<TUpdateUserControllerOutput> {
  const parsed = await UpdateUserValidationSchema.safeParseAsync(input);

  if (!parsed.success) {
    throw new InputParseError(parsed.error);
  }

  const data = await updateUserUseCase(parsed.data);
  return presenter(data);
}
