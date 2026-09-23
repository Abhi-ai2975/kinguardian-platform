import {
  UnbanUserValidationSchema,
  TUserSchema,
} from "@/modules/entities/schemas/admin/users/users.schema";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { unbanUserUseCase } from "../../../application/usecases/users/unbanUser.usecase";

function presenter(data: TUserSchema) {
  return data;
}

export type TUnbanUserControllerOutput = ReturnType<typeof presenter>;

export async function unbanUserController(input: unknown): Promise<TUnbanUserControllerOutput> {
  const parsed = await UnbanUserValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await unbanUserUseCase(parsed.data);
  return presenter(data);
}
