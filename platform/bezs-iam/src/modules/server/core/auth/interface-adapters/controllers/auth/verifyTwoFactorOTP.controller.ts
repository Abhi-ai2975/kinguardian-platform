import { InputParseError } from "@/modules/server/shared/errors/schemaParseError"
import {
  TVerifyTwoFactorOTPDtoSchema,
  VerifyTwoFactorOTPValidationSchema,
} from "@/modules/entities/schemas/auth"
import { verifyTwoFactorOTPUseCase } from "../../../application/usecases/auth/verifyTwoFactorOTP.usecase"

function presenter(data: TVerifyTwoFactorOTPDtoSchema) {
  return data
}

export type TVerifyTwoFactorOTPControllerOutput = ReturnType<typeof presenter>

export async function verifyTwoFactorOTPController(
  input: any,
): Promise<TVerifyTwoFactorOTPControllerOutput> {
  const parsed = await VerifyTwoFactorOTPValidationSchema.safeParseAsync(input)

  if (!parsed.success) {
    throw new InputParseError(parsed.error)
  }

  const data = await verifyTwoFactorOTPUseCase(parsed.data)
  return presenter(data)
}
