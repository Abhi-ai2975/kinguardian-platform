/**
 * ZSA error handling utilities.
 *
 * Layer: server / shared / errors / mappers
 *
 * Provides a single function that maps an HTTP status code to the appropriate
 * ZSA error code and throws it. Used by mapErrorToZSA to keep the switch
 * logic isolated and reusable.
 */

"server-only";

import { ZSAError } from "zsa";
import { ZSA_ERROR_CODES } from "./zsaErrorCodes";

/**
 * Maps an HTTP status code to the corresponding ZSA error code and throws.
 * Always throws — return type is `never`.
 *
 * @param statusCode - HTTP status code from the domain error.
 * @param message    - Optional error message; falls back to a status-specific default.
 * @throws ZSAError with the appropriate code.
 */
export function throwZSAErrorFromStatus(
  statusCode: number,
  message?: string,
): never {
  switch (statusCode) {
    case 400:
      throw new ZSAError(
        ZSA_ERROR_CODES.INPUT_PARSE_ERROR,
        message ?? "Invalid input. Please check your data and try again.",
      );
    case 401:
      throw new ZSAError(
        ZSA_ERROR_CODES.NOT_AUTHORIZED,
        message ?? "You are not authorised to perform this action.",
      );
    case 402:
      throw new ZSAError(
        ZSA_ERROR_CODES.PAYMENT_REQUIRED,
        message ?? "Payment is required to access this resource.",
      );
    case 403:
      throw new ZSAError(
        ZSA_ERROR_CODES.FORBIDDEN,
        message ?? "You do not have permission to perform this action.",
      );
    case 404:
      throw new ZSAError(
        ZSA_ERROR_CODES.NOT_FOUND,
        message ?? "The requested resource was not found.",
      );
    case 405:
      throw new ZSAError(
        ZSA_ERROR_CODES.METHOD_NOT_SUPPORTED,
        message ?? "This operation is not supported.",
      );
    case 408:
      throw new ZSAError(
        ZSA_ERROR_CODES.TIMEOUT,
        message ?? "The request timed out. Please try again.",
      );
    case 409:
      throw new ZSAError(
        ZSA_ERROR_CODES.CONFLICT,
        message ?? "A conflict occurred. The resource may already exist.",
      );
    case 412:
      throw new ZSAError(
        ZSA_ERROR_CODES.PRECONDITION_FAILED,
        message ?? "A required precondition was not met.",
      );
    case 413:
      throw new ZSAError(
        ZSA_ERROR_CODES.PAYLOAD_TOO_LARGE,
        message ?? "The request payload is too large.",
      );
    case 422:
      throw new ZSAError(
        ZSA_ERROR_CODES.UNPROCESSABLE_CONTENT,
        message ??
          "The request could not be processed. Please check your input.",
      );
    case 429:
      throw new ZSAError(
        ZSA_ERROR_CODES.TOO_MANY_REQUESTS,
        message ?? "Too many requests. Please slow down and try again later.",
      );
    case 499:
      throw new ZSAError(
        ZSA_ERROR_CODES.CLIENT_CLOSED_REQUEST,
        message ?? "The request was cancelled.",
      );
    case 500:
      throw new ZSAError(
        ZSA_ERROR_CODES.INTERNAL_SERVER_ERROR,
        message ?? "An internal server error occurred. Please try again later.",
      );
    default:
      throw new ZSAError(
        ZSA_ERROR_CODES.ERROR,
        message ?? "An unexpected error occurred. Please try again.",
      );
  }
}
