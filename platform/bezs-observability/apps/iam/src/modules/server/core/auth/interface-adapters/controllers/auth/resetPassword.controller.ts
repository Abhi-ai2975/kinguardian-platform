import {
  ResetPasswordValidationSchema,
  TResetPasswordDtoSchema,
} from "@/modules/entities/schemas/auth";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { resetPasswordUseCase } from "../../../application/usecases/auth/resetPassword.usecase";

function presenter(data: TResetPasswordDtoSchema) {
  return data;
}

export type TResetPasswordControllerOutput = ReturnType<typeof presenter>;

export async function resetPasswordController(
  input: unknown,
  token: string,
): Promise<TResetPasswordControllerOutput> {
  const parsed = await ResetPasswordValidationSchema.safeParseAsync(input);

  if (!parsed.success) {
    throw new InputParseError(parsed.error);
  }

  const data = await resetPasswordUseCase({
    newPassword: parsed.data.newPassword,
    token,
  });
  return presenter(data);
}
