import { TSendTwoFactorOTPDtoSchema } from "@/modules/entities/schemas/auth"
import { sendTwoFactorOTPUseCase } from "../../../application/usecases/auth/sendTwoFactorOTP.usecase"

function presenter(data: TSendTwoFactorOTPDtoSchema) {
  return data
}

export type TSendTwoFactorOTPControllerOutput = ReturnType<typeof presenter>

export async function sendTwoFactorOTPController(): Promise<TSendTwoFactorOTPControllerOutput> {
  const data = await sendTwoFactorOTPUseCase()
  return presenter(data)
}
