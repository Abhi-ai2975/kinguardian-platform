import { FieldValues, UseFormReturn } from "react-hook-form";
import { ZSAError } from "zsa";

export interface IHandleZSAError<T extends FieldValues> {
  err: ZSAError;
  form?: UseFormReturn<T>;
  fallbackMessage?: string;
}

export interface IZSAParseErrors {
  fieldErrors: Record<string, string[] | undefined>;
  formErrors: string[];
  formattedErrors: {
    _errors: string[];
    [key: string]: any;
  };
}

export interface IZSAErrorPayload {
  inputParseErrors?: IZSAParseErrors;
  outputParseErrors?: IZSAParseErrors;
}
