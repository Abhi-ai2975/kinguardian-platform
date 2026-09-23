import { InputParseError } from "@/modules/server/shared/errors/schemaParseError"
import {
  TVerifyTOTPDtoSchema,
  VerifyTOTPValidationSchema,
} from "@/modules/entities/schemas/auth"
import { verifyTOTPUseCase } from "../../../application/usecases/auth/verifyTOTP.usecase"

function presenter(data: TVerifyTOTPDtoSchema) {
  return data
}

export type TVerifyTOTPControllerOutput = ReturnType<typeof presenter>

export async function verifyTOTPController(
  input: unknown,
): Promise<TVerifyTOTPControllerOutput> {
  const parsed = await VerifyTOTPValidationSchema.safeParseAsync(input)

  if (!parsed.success) {
    throw new InputParseError(parsed.error)
  }

  const data = await verifyTOTPUseCase(parsed.data)
  return presenter(data)
}
