/**
 * server/shared/errors/mappers/zsa-error-handling — HTTP status → ZSA error.
 *
 * Maps a numeric HTTP status code to the appropriate ZSA error code and
 * throws. Called by mapErrorToZSA when the backend returns a non-2xx
 * response so the action layer surfaces a typed, client-readable error.
 *
 * @module
 */
"server-only";

import { ZSAError } from "zsa";
import { ZSA_ERROR_CODES } from "./zsa-error-codes";

export function throwZSAErrorFromStatus(statusCode: number, message?: string): never {
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
    case 409:
      throw new ZSAError(
        ZSA_ERROR_CODES.CONFLICT,
        message ?? "A conflict occurred. The resource may already exist.",
      );
    case 413:
      throw new ZSAError(
        ZSA_ERROR_CODES.PAYLOAD_TOO_LARGE,
        message ?? "The request payload is too large.",
      );
    case 422:
      throw new ZSAError(
        ZSA_ERROR_CODES.UNPROCESSABLE_CONTENT,
        message ?? "The request could not be processed. Please check your input.",
      );
    case 429:
      throw new ZSAError(
        ZSA_ERROR_CODES.TOO_MANY_REQUESTS,
        message ?? "Too many requests. Please slow down and try again later.",
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
