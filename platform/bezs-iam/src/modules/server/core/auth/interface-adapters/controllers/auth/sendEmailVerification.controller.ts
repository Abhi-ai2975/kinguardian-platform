import {
  SendVerificationEmailValidationSchema,
  TSendEmailVerificationDtoSchema
} from "@/modules/entities/schemas/auth"
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError"
import { sendEmailVerificationUseCase } from "../../../application/usecases/auth/sendEmailVerification.usecase"

function presenter(data: TSendEmailVerificationDtoSchema) {
  return data
}

export type TSendEmailVerificationControllerOutPut = ReturnType<
  typeof presenter
>

export async function sendEmailVerificationController(
  input: any
): Promise<TSendEmailVerificationControllerOutPut> {
  const parsed =
    await SendVerificationEmailValidationSchema.safeParseAsync(input)

  if (!parsed.success) {
    throw new InputParseError(parsed.error)
  }

  const data = await sendEmailVerificationUseCase(parsed.data)
  return presenter(data)
}
