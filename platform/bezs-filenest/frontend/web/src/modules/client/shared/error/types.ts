/**
 * client/shared/error/types — ZSA error handling interfaces.
 *
 * Shared between handleZSAError (runtime) and any component that inspects
 * ZSA error payloads manually.
 *
 * @module
 */
import { FieldValues, UseFormReturn } from "react-hook-form";
import { ZSAError } from "zsa";

export interface IHandleZSAError<T extends FieldValues> {
  err: ZSAError;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form?: UseFormReturn<T, any, any>;
  fallbackMessage?: string;
}

export interface IZSAParseErrors {
  fieldErrors: Record<string, string[] | undefined>;
  formErrors: string[];
  formattedErrors: { _errors: string[]; [key: string]: unknown };
}

export interface IZSAErrorPayload {
  inputParseErrors?: IZSAParseErrors;
  outputParseErrors?: IZSAParseErrors;
}
