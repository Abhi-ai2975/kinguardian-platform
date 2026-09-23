import { TSignoutResponseDtoSchema } from "@/modules/entities/schemas/auth"
import { signoutUseCase } from "../../../application/usecases/auth/signout.usecase"

// Use an inline presenter for simple output mapping.
// Extract a dedicated presenter when presentation logic grows in complexity.
function presenter(data: TSignoutResponseDtoSchema) {
  return data
}

export type TSignoutControllerOutput = ReturnType<typeof presenter>

/**
 * Controller responsible for:
 * - input validation
 * - orchestrating use cases
 * - delegating output transformation to presenters
 *
 * Business rules are handled in use cases.
 */
export async function signoutController(): Promise<TSignoutControllerOutput> {
  const data = await signoutUseCase()
  return presenter(data)
}
