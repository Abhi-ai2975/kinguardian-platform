import {
  BanUserValidationSchema,
  TUserSchema,
} from "@/modules/entities/schemas/admin/users/users.schema";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { banUserUseCase } from "../../../application/usecases/users/banUser.usecase";

function presenter(data: TUserSchema) {
  return data;
}

export type TBanUserControllerOutput = ReturnType<typeof presenter>;

export async function banUserController(input: unknown): Promise<TBanUserControllerOutput> {
  const parsed = await BanUserValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await banUserUseCase(parsed.data);
  return presenter(data);
}
