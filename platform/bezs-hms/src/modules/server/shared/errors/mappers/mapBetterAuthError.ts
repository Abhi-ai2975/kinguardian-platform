import {
  isBetterAuthErrorCode,
  TBetterAuthSdkError
} from "@/modules/server/auth-provider/betterauth-error-codes"
import { InfrastructureError } from "../infrastructureError"
import { mapBetterAuthCodeToDomainError } from "./mapBetterAuthCodeToDomainError"

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
