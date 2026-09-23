"client-only";

/**
 * client/shared/error/handle-zsa-error — maps ZSA errors to UI feedback.
 *
 * Pass `err` from a `useServerAction` onError callback. Field-level errors
 * (INPUT_PARSE_ERROR) are applied directly to the React Hook Form instance
 * via `form.setError()`. Non-field errors and all other codes are shown as
 * sonner toasts.
 *
 * @module
 */
import { toast } from "sonner";
import type { FieldValues, Path } from "react-hook-form";
import type { IHandleZSAError, IZSAErrorPayload } from "./types";

export function parseZSAErrorData<T>(data: unknown): T | null {
  if (typeof data !== "string") return null;
  try {
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
}

export function handleZSAError<T extends FieldValues>({
  err,
  form,
  fallbackMessage,
}: IHandleZSAError<T>): void {
  const nonFormMessages: string[] = [];

  if (err.code === "INPUT_PARSE_ERROR") {
    const parsed = parseZSAErrorData<IZSAErrorPayload>(err.data);
    const inputErrors = parsed?.inputParseErrors;

    if (!inputErrors) {
      toast.error(err.message || fallbackMessage || "Invalid input.");
      return;
    }

    if (inputErrors.fieldErrors) {
      Object.entries(inputErrors.fieldErrors).forEach(([field, messages]) => {
        if (!messages?.[0]) return;
        if (form && field in form.getValues()) {
          form.setError(field as Path<T>, { type: "server", message: messages[0] });
        } else {
          nonFormMessages.push(messages[0]);
        }
      });
    }

    if (nonFormMessages.length) {
      toast.error(fallbackMessage ?? "Something went wrong. Please refresh and try again.");
      return;
    }

    if (inputErrors.formErrors?.length) {
      toast.error(inputErrors.formErrors[0]);
    }

    return;
  }

  if (err.code === "OUTPUT_PARSE_ERROR") {
    toast.error(fallbackMessage ?? "Something went wrong. Please try again later.");
    return;
  }

  if (err.code === "NOT_AUTHORIZED") {
    toast.error("You are not authorised to perform this action.");
    return;
  }

  if (err.code === "FORBIDDEN") {
    toast.error("You do not have permission to perform this action.");
    return;
  }

  if (err.code === "NOT_FOUND") {
    toast.error(err.message || "The requested resource was not found.");
    return;
  }

  if (err.code === "CONFLICT") {
    toast.error(err.message || "A conflict occurred. The resource may already exist.");
    return;
  }

  toast.error(err.message || fallbackMessage || "Something went wrong.");
}
