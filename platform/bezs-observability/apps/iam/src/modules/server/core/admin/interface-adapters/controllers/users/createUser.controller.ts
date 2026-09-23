import {
  CreateUserValidationSchema,
  TUserSchema,
} from "@/modules/entities/schemas/admin/users/users.schema";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { createUserUseCase } from "../../../application/usecases/users/createUser.usecase";

function presenter(data: TUserSchema) {
  return data;
}

export type TCreateUserControllerOutput = ReturnType<typeof presenter>;

export async function createUserController(input: unknown): Promise<TCreateUserControllerOutput> {
  const parsed = await CreateUserValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await createUserUseCase(parsed.data);
  return presenter(data);
}
