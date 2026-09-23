import { ImpersonateUserValidationSchema, TUserSchema } from "@/modules/entities/schemas/admin/users/users.schema";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { impersonateUserUseCase } from "../../../application/usecases/users/impersonateUser.usecase";

function presenter(data: { session: unknown; user: TUserSchema }) {
  return data;
}

export type TImpersonateUserControllerOutput = ReturnType<typeof presenter>;

export async function impersonateUserController(
  input: unknown,
): Promise<TImpersonateUserControllerOutput> {
  const parsed = await ImpersonateUserValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await impersonateUserUseCase(parsed.data);
  return presenter(data);
}
