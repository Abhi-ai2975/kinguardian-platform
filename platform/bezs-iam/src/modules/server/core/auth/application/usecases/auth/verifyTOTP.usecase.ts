import {
  TVerifyTOTPDtoSchema,
  TVerifyTOTPValidationSchema,
} from "@/modules/entities/schemas/auth"
import { getInjection } from "@/modules/server/di/container"

export async function verifyTOTPUseCase(
  payload: TVerifyTOTPValidationSchema,
): Promise<TVerifyTOTPDtoSchema> {
  const authService = getInjection("IAuthService")
  return authService.verifyTwoFactorTOTP(payload)
}
