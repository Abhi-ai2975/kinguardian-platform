import {
  TResetPasswordDtoSchema,
} from "@/modules/entities/schemas/auth";
import { TResetPasswordPayload } from "@/modules/entities/types/auth";
import { getInjection } from "@/modules/server/di/container";

export async function resetPasswordUseCase(
  payload: TResetPasswordPayload,
): Promise<TResetPasswordDtoSchema> {
  const authService = getInjection("IAuthService");
  return await authService.resetPassword(payload);
}
