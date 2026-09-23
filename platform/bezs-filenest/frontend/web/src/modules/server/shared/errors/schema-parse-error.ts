/**
 * server/shared/errors/schema-parse-error — Zod parse error wrappers.
 *
 * Wraps a ZodError into a typed error class so `mapErrorToZSA` can detect
 * validation failures and convert them to ZSA INPUT_PARSE_ERROR responses
 * with field-level error maps that clients can apply to form fields.
 *
 * @module
 */
import { ZodError } from "zod";

abstract class BaseParseError extends Error {
  public readonly fieldErrors: Record<string, string[] | undefined>;
  public readonly formErrors: string[];
  public readonly formattedErrors: { _errors: string[]; [key: string]: unknown };

  protected constructor(zodError: ZodError, message: string, name: string) {
    super(message);
    this.name = name;
    const flattened = zodError.flatten();
    this.fieldErrors = flattened.fieldErrors as Record<string, string[] | undefined>;
    this.formErrors = flattened.formErrors;
    this.formattedErrors = zodError.format((issue) => issue.message) as {
      _errors: string[];
      [key: string]: unknown;
    };
  }
}

export class InputParseError extends BaseParseError {
  constructor(zodError: ZodError) {
    super(zodError, "Invalid input", "InputParseError");
  }
}

export class OutputParseError extends BaseParseError {
  constructor(zodError: ZodError) {
    super(zodError, "Unexpected server response", "OutputParseError");
  }
}
