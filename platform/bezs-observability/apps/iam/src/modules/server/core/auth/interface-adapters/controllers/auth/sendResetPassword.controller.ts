import {
  SendResetPasswordValidationSchema,
  TSendResetPasswordDtoSchema,
} from "@/modules/entities/schemas/auth";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { sendResetPasswordUseCase } from "../../../application/usecases/auth/sendResetPassword.usecase";

function presenter(data: TSendResetPasswordDtoSchema) {
  return data;
}

export type TSendResetPasswordControllerOutput = ReturnType<typeof presenter>;

export async function sendResetPasswordController(
  input: unknown,
): Promise<TSendResetPasswordControllerOutput> {
  const parsed = await SendResetPasswordValidationSchema.safeParseAsync(input);

  if (!parsed.success) {
    throw new InputParseError(parsed.error);
  }

  const data = await sendResetPasswordUseCase(parsed.data);
  return presenter(data);
}
