"server-only";

import {
  InputParseError,
  OutputParseError,
} from "@/modules/server/shared/errors/schemaParseError";
import { ZSAError } from "zsa";
import { ApplicationError } from "../applicationError";

function isNextJsControlError(error: any) {
  return (
    error?.message === "NEXT_REDIRECT" || error?.message === "NEXT_NOT_FOUND"
  );
}

export function mapErrorToZSA(error: unknown): never {
  // IMPORTANT:
  // Next.js `redirect()` / `notFound()` throw special control errors.
  // These are NOT real errors and must NOT be transformed or wrapped.
  // Rethrowing them untouched allows Next.js to intercept and perform
  // navigation before any serialization, so nothing reaches the client.
  if (isNextJsControlError(error)) {
    throw error;
  }
  /**
   * IMPORTANT:
   * The Server Action is the serialization boundary.
   *
   * Any value returned or thrown from here (even to Server Components)
   * goes through the React Server Components (RSC) transport pipeline.
   *
   * ZSA aligns with React's rules:
   * - Server Components are NOT "local Node code"
   * - They are transport consumers via React Flight
   * - Therefore, all data must be serializable
   *
   * Inside controllers/usecases (before this boundary),
   * custom error classes retain full structure and prototypes.
   */

  // User-fixable validation error
  if (error instanceof InputParseError) {
    /**
     * ❌ INVALID (ZSAError only accepts (code, data)):
     *
     * throw new ZSAError("INPUT_PARSE_ERROR", error.message, {
     *   inputParseErrors: {...}
     * });
     *
     * ✅ CORRECT:
     * Pass ONE object as the second argument.
     * ZSA will serialize it and expose it as `err.data` on the consumer.
     */
    throw new ZSAError("INPUT_PARSE_ERROR", {
      inputParseErrors: {
        fieldErrors: error.fieldErrors,
        formErrors: error.formErrors,
        formattedErrors: error.formattedErrors,
      },
    });
  }

  // Internal-only error (log on server, hide details from user)
  if (error instanceof OutputParseError) {
    // Log here if needed
    throw new ZSAError(
      "OUTPUT_PARSE_ERROR",
      "Something went wrong. Please try again later."
    );
  }

  // Application-level error
  if (error instanceof ApplicationError) {
    if (!error.isOperational) {
      console.error(error);
    }
    throw new ZSAError("ERROR", error.message);
  }

  // Generic runtime error
  if (error instanceof Error) {
    throw new ZSAError("ERROR", error.message);
  }

  // Truly unknown
  throw new ZSAError("INTERNAL_SERVER_ERROR", "Something went wrong");
}
