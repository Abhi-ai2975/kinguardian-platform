"server-only";

import {
  InputParseError,
  OutputParseError,
} from "@/modules/server/shared/errors/schemaParseError";
import { ZSAError } from "zsa";
import { ApplicationError } from "../applicationError";
import { throwZSAErrorFromStatus } from "./zsaErrorHandling";
import { ZSA_ERROR_CODES } from "./zsaErrorCodes";

function isNextJsControlError(error: any) {
  return (
    error?.message === "NEXT_REDIRECT" || error?.message === "NEXT_NOT_FOUND"
  );
}

export function mapErrorToZSA(error: unknown): never {
  // Next.js redirect()/notFound() throw special control errors that must not be transformed.
  if (isNextJsControlError(error)) {
    throw error;
  }

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

  if (error instanceof ApplicationError) {
    if (!error.isOperational) {
      // console.error(error);
    }
    throwZSAErrorFromStatus(error.statusCode, error.message);
  }

  if (error instanceof Error) {
    throw new ZSAError(ZSA_ERROR_CODES.ERROR, error.message);
  }

  throw new ZSAError(
    ZSA_ERROR_CODES.INTERNAL_SERVER_ERROR,
    "Something went wrong",
  );
}
