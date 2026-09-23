import {
  isBetterAuthErrorCode,
  TBetterAuthSdkError
} from "@/modules/server/auth-provider/betterauth-error-codes"
import { InfrastructureError } from "../infrastructureError"
import { mapBetterAuthCodeToDomainError } from "./mapBetterAuthCodeToDomainError"

/**
 * Translates BetterAuth SDK errors into application-level errors.
 *
 * @param error - raw error thrown by BetterAuth
 * @param infraMessage - contextual infrastructure message (dynamic)
 * @throws ApplicationError
 */
export function mapBetterAuthError(
  error: unknown,
  infraMessage: string
): never {
  const err = error as TBetterAuthSdkError

  const rawCode = err.body?.code ?? err.code

  if (isBetterAuthErrorCode(rawCode)) {
    mapBetterAuthCodeToDomainError(rawCode)
  }

  throw new InfrastructureError(infraMessage, error)
}
