/**
 * server/shared/errors/mappers/map-error-to-zsa — universal error transformer.
 *
 * Called inside runWithTransport's catch block. Converts any thrown value to a
 * ZSAError so the client always receives a typed, structured error response.
 * Next.js control-flow errors (redirect, notFound) are re-thrown unchanged so
 * the framework's routing logic still fires correctly.
 *
 * @module
 */
"server-only";

import { ZSAError } from "zsa";
import { InputParseError, OutputParseError } from "../schema-parse-error";
import { throwZSAErrorFromStatus } from "./zsa-error-handling";
import { ZSA_ERROR_CODES } from "./zsa-error-codes";

function isNextControlError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.message === "NEXT_REDIRECT" || error.message === "NEXT_NOT_FOUND")
  );
}

export function mapErrorToZSA(error: unknown): never {
  if (isNextControlError(error)) throw error;

  if (error instanceof InputParseError) {
    throw new ZSAError(ZSA_ERROR_CODES.INPUT_PARSE_ERROR, {
      inputParseErrors: {
        fieldErrors: error.fieldErrors,
        formErrors: error.formErrors,
        formattedErrors: error.formattedErrors,
      },
    });
  }

  if (error instanceof OutputParseError) {
    throw new ZSAError(
      ZSA_ERROR_CODES.OUTPUT_PARSE_ERROR,
      "Something went wrong. Please try again later.",
    );
  }

  // ApiError thrown by filenestApi() carries the HTTP status code.
  if (error instanceof ApiError) {
    throwZSAErrorFromStatus(error.statusCode, error.message);
  }

  if (error instanceof Error) {
    throw new ZSAError(ZSA_ERROR_CODES.ERROR, error.message);
  }

  throw new ZSAError(ZSA_ERROR_CODES.INTERNAL_SERVER_ERROR, "Something went wrong.");
}

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
