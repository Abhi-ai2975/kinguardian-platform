import {
  TVerifyTwoFactorOTPDtoSchema,
  TVerifyTwoFactorOTPValidationSchema,
} from "@/modules/entities/schemas/auth"
import { getInjection } from "@/modules/server/di/container"

export async function verifyTwoFactorOTPUseCase(
  payload: TVerifyTwoFactorOTPValidationSchema,
): Promise<TVerifyTwoFactorOTPDtoSchema> {
  const authService = getInjection("IAuthService")
  const data = await authService.verifyTwoFactorOTP(payload)
  return data
}
