import {
  TSigninResponseDtoSchema,
  TSigninValidationSchema
} from "@/modules/entities/schemas/auth"
import { getInjection } from "@/modules/server/di/container"

export async function signinUseCase(
  payload: TSigninValidationSchema
): Promise<TSigninResponseDtoSchema> {
  const authService = getInjection("IAuthService")
  const data = authService.signInWithEmail(payload)
  return data
}
