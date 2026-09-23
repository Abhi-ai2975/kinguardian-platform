import { ZodError } from "zod";

export abstract class BaseParseError extends Error {
  public readonly fieldErrors: Record<string, string[] | undefined>;
  public readonly formErrors: string[];
  public readonly formattedErrors: {
    _errors: string[];
    [key: string]: any;
  };

  protected constructor(zodError: ZodError, message: string, name: string) {
    super(message);
    this.name = name;

    const flattened = zodError.flatten();
    this.fieldErrors = flattened.fieldErrors;
    this.formErrors = flattened.formErrors;
    this.formattedErrors = zodError.format((issue) => issue.message);
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
