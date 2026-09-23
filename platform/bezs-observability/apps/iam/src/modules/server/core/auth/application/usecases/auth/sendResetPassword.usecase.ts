import {
  TSendResetPasswordDtoSchema,
  TSendResetPasswordValidationSchema,
} from "@/modules/entities/schemas/auth";
import { getInjection } from "@/modules/server/di/container";

export async function sendResetPasswordUseCase(
  payload: TSendResetPasswordValidationSchema,
): Promise<TSendResetPasswordDtoSchema> {
  const authService = getInjection("IAuthService");
  return await authService.sendResetPassword(payload);
}
