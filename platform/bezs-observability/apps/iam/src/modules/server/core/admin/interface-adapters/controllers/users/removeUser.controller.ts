import { RemoveUserValidationSchema } from "@/modules/entities/schemas/admin/users/users.schema";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { removeUserUseCase } from "../../../application/usecases/users/removeUser.usecase";

function presenter(data: { success: boolean }) {
  return data;
}

export type TRemoveUserControllerOutput = ReturnType<typeof presenter>;

export async function removeUserController(input: unknown): Promise<TRemoveUserControllerOutput> {
  const parsed = await RemoveUserValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await removeUserUseCase(parsed.data);
  return presenter(data);
}
