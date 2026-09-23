import {
  TSigninWithSocialResponseDtoSchema,
  TSigninWithSocialValidationSchema
} from "@/modules/entities/schemas/auth"
import { getInjection } from "@/modules/server/di/container"

export async function signinWithSocialUseCase(
  payload: TSigninWithSocialValidationSchema
): Promise<TSigninWithSocialResponseDtoSchema> {
  const authService = getInjection("IAuthService")
  const data = authService.signInWithSocial(payload)
  return data
}
