/**
 * @module shared/errors/mapBetterAuthError
 * @description Translates Better Auth SDK errors into application-level errors.
 *              The anti-corruption layer between Better Auth's error format
 *              and our domain error classes.
 *
 * **Flow:**
 * 1. Extract error code from `err.body.code` or `err.code`.
 * 2. If it's a known Better Auth code, delegate to `mapBetterAuthCodeToDomainError`
 *    which throws the appropriate `AuthError` or `ApplicationError`.
 * 3. If unrecognized, throw `InfrastructureError` — treated as a system fault.
 *
 * @param error - Raw error thrown by Better Auth SDK.
 * @param infraMessage - Contextual message for unrecognized errors.
 * @throws {AuthError} If the code maps to a known auth-domain error.
 * @throws {ApplicationError} If the code maps to a known business rule violation.
 * @throws {InfrastructureError} For all unrecognized/unknown errors.
 * @category Error Handling
 */

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
