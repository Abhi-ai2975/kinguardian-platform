import { InputParseError } from "@/modules/server/shared/errors/schemaParseError"
import {
  SigninWithSocialValidationSchema,
  TSigninWithSocialResponseDtoSchema
} from "@/modules/entities/schemas/auth"
import { signinWithSocialUseCase } from "../../../application/usecases/auth/signinWithSocial.usecase"

function presenter(data: TSigninWithSocialResponseDtoSchema) {
  return data
}

export type TSigninWithSocialControllerOutput = ReturnType<typeof presenter>

export async function signinWithSocialController(
  input: any
): Promise<TSigninWithSocialControllerOutput> {
  const parsed = await SigninWithSocialValidationSchema.safeParseAsync(input)

  if (!parsed.success) {
    throw new InputParseError(parsed.error)
  }

  const data = await signinWithSocialUseCase(parsed.data)
  return presenter(data)
}
