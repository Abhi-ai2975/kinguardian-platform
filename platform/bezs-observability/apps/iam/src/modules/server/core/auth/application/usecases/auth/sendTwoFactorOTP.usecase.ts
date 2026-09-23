import {
  TSendTwoFactorOTPDtoSchema,
  TSendTwoFactorOTPActionSchema,
} from "@/modules/entities/schemas/auth"
import { getInjection } from "@/modules/server/di/container"

export async function sendTwoFactorOTPUseCase(): Promise<TSendTwoFactorOTPDtoSchema> {
  const authService = getInjection("IAuthService")
  const data = await authService.sendTwoFactorOTP({})
  return data
}
