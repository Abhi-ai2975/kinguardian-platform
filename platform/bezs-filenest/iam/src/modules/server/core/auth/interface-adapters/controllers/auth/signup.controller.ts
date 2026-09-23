import { InputParseError } from "@/modules/server/shared/errors/schemaParseError"
import {
  SignupValidationSchema,
  TSignupResponseDtoSchema
} from "@/modules/entities/schemas/auth"
import { signupUseCase } from "../../../application/usecases/auth/signup.usecase"

// Use an inline presenter for simple output mapping.
// Extract a dedicated presenter when presentation logic grows in complexity.
function presenter(data: TSignupResponseDtoSchema) {
  return data
}

export type TSignupControllerOutput = ReturnType<typeof presenter>

/**
 * Controller responsible for:
 * - input validation
 * - orchestrating use cases
 * - delegating output transformation to presenters
 *
 * Business rules are handled in use cases.
 */
export async function signupController(
  input: any
): Promise<TSignupControllerOutput> {
  const parsed = await SignupValidationSchema.safeParseAsync(input)

  if (!parsed.success) {
    throw new InputParseError(parsed.error)
  }

  const data = await signupUseCase(parsed.data)
  return presenter(data)
}
