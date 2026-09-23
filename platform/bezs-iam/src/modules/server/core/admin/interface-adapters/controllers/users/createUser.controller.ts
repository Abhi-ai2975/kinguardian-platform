/**
 * @module admin/users/createUser.controller
 * @description Controller for creating a new user. Validates incoming input
 *              with Zod's `safeParseAsync` — throws `InputParseError` on failure.
 *              The presenter simply passes through the created user.
 *
 * **Pattern:** validate → delegate to use case → present.
 * @category Controller
 * @layer Interface Adapters
 */

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
