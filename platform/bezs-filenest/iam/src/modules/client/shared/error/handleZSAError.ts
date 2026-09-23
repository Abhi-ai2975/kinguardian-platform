/**
 * @module shared/error/handleZSAError
 * @description Client-side ZSA error handler used in every modal's `onError`
 *              callback. Maps ZSA error codes to appropriate user feedback
 *              (form field errors via React Hook Form, or toast messages).
 *
 * **Error code handling:**
 * - `INPUT_PARSE_ERROR` — Zod validation failure. Attaches field-level errors
 *   to RHF form (matching field names), or shows a fallback toast.
 * - `OUTPUT_PARSE_ERROR` — Internal schema mismatch. Shows generic toast
 *   (never exposes internal details to users).
 * - `NOT_AUTHORIZED` — Permission denied toast.
 * - Fallback — Shows `err.message` or the `fallbackMessage`.
 *
 * @param err — ZSA error object from `useServerAction`.
 * @param form — React Hook Form instance (optional). When provided, field-level
 *               errors matching form field names are attached to inputs.
 * @param fallbackMessage — Shown for parse errors and unknown errors.
 * @category Client Error Handling
 */

"client-only"

import { toast } from "sonner"
import { FieldValues, Path } from "react-hook-form"
import { IHandleZSAError, IZSAErrorPayload } from "./types"

export function parseZSAErrorData<T>(data: unknown): T | null {
  if (typeof data !== "string") return null
  try {
    return JSON.parse(data) as T
  } catch {
    return null
  }
}

export function handleZSAError<T extends FieldValues>(
  params: IHandleZSAError<T>
) {
  const { err, form, fallbackMessage } = params

  const nonFormFieldMessages: string[] = []

  if (err.code === "INPUT_PARSE_ERROR") {
    const parsed = parseZSAErrorData<IZSAErrorPayload>(err.data)
    const inputErrors = parsed?.inputParseErrors

    if (!inputErrors) {
      toast.error(err.message || fallbackMessage || "Invalid input")
      return
    }

    if (inputErrors.fieldErrors) {
      Object.entries(inputErrors.fieldErrors).forEach(([field, messages]) => {
        if (!messages?.[0]) return

        if (form) {
          const formValues = form.getValues()

          if (field in formValues) {
            form.setError(field as Path<T>, {
              type: "server",
              message: messages[0]
            })
          } else {
            nonFormFieldMessages.push(messages[0])
          }
        } else {
          nonFormFieldMessages.push(messages[0])
        }
      })
    }

    let didShowToast = false

    if (nonFormFieldMessages.length) {
      toast.error(
        fallbackMessage ??
          "Something went wrong. Please refresh the page and try again."
      )
      didShowToast = true
    }

    if (!didShowToast && inputErrors.formErrors?.length) {
      toast.error(inputErrors.formErrors[0])
    }

    return
  }

  if (err.code === "OUTPUT_PARSE_ERROR") {
    toast.error(
      fallbackMessage ?? "Something went wrong. Please try again later."
    )
    return
  }

  if (err.code === "NOT_AUTHORIZED") {
    toast.error("You are not authorized to perform this action")
    return
  }

  toast.error(err.message || fallbackMessage || "Something went wrong")
}
