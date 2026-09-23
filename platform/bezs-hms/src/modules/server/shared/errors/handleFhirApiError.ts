/**
 * Shared fhir-gql API error handler.
 *
 * Layer: server / shared / errors
 *
 * Centralises Axios → domain error mapping for all FHIR resource REST services.
 * Previously each resource had its own copy of this logic; this module is the single
 * source of truth so fixes (new status codes, improved message parsing) apply everywhere.
 *
 * Two exports:
 *   parseFhirDetail  — extracts a human-readable string from any fhir-gql error body shape.
 *   handleFhirApiError — the unified switch that maps HTTP status to domain errors.
 */

"server-only";

import { AxiosError } from "axios";
import {
  BadGatewayError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  RateLimitError,
  UnauthorizedError,
  ValidationError,
} from "./commonErrors";

/**
 * Extracts a human-readable error message from a fhir-gql FastAPI response body.
 *
 * fhir-gql's `body.detail` can arrive in several shapes:
 *
 *   1. Plain string — returned as-is.
 *   2. Pydantic v2 validation array `[{ msg, loc, type }]` — returns first `msg`.
 *   3. JSON-encoded string — happens when the downstream FHIR Server body has no
 *      top-level `detail` key; fhir-gql falls back to `r.text`, which may be a full
 *      FHIR OperationOutcome. Sub-cases:
 *        • OperationOutcome  `{ resourceType, issue[].diagnostics }` → joined diagnostics
 *        • Single issue obj  `{ diagnostics: "…" }`                 → diagnostics field
 *        • Pydantic array    `[{ msg: "…" }]`                       → first msg
 *
 * @param body     - Parsed JSON response body from fhir-gql (may be undefined).
 * @param fallback - Returned verbatim when no usable message can be extracted.
 * @returns Human-readable error message string.
 */
export function parseFhirDetail(
  body: Record<string, unknown> | undefined,
  fallback: string,
): string {
  const detail = body?.detail;

  // Pydantic v2 — FastAPI returns validation errors as an array of issue objects.
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0] as Record<string, unknown>;
    if (typeof first?.msg === "string") return first.msg;
  }

  if (typeof detail === "string") {
    // Attempt JSON parse — fhir-gql may forward the raw FHIR Server response body
    // (r.text) as the detail string when the body has no top-level `detail` key.
    try {
      const parsed: unknown = JSON.parse(detail);

      if (
        parsed !== null &&
        typeof parsed === "object" &&
        !Array.isArray(parsed)
      ) {
        const obj = parsed as Record<string, unknown>;

        // FHIR R4 OperationOutcome
        if (
          obj.resourceType === "OperationOutcome" &&
          Array.isArray(obj.issue)
        ) {
          const msgs = (obj.issue as Record<string, unknown>[])
            .map((i) => {
              if (typeof i.diagnostics === "string") return i.diagnostics;
              const details = i.details as Record<string, unknown> | undefined;
              return typeof details?.text === "string"
                ? details.text
                : undefined;
            })
            .filter((m): m is string => m !== undefined);
          if (msgs.length > 0) return msgs.join("; ");
        }

        // Single FHIR issue object (some downstream servers return this directly)
        if (typeof obj.diagnostics === "string") return obj.diagnostics;
      }

      // Pydantic v2 error array encoded as a JSON string
      if (Array.isArray(parsed) && parsed.length > 0) {
        const first = parsed[0] as Record<string, unknown>;
        if (typeof first?.msg === "string") return first.msg;
      }
    } catch {
      // Not JSON — use the string as-is.
    }

    return detail;
  }

  return fallback;
}

/**
 * Unified Axios → domain error mapper for all fhir-gql resource REST services.
 *
 * Covers every HTTP status fhir-gql can return, including 422 (Pydantic validation
 * on the fhir-gql side) which several per-resource handlers were previously missing.
 * Uses parseFhirDetail() so that structured FHIR / Pydantic bodies always produce
 * a clean human-readable message rather than raw JSON.
 *
 * @param error   - AxiosError thrown by the REST service's HTTP call.
 * @param context - Resource label used in the BadGatewayError message (e.g. "Patient").
 *
 * @throws ValidationError    on HTTP 400 or 422
 * @throws UnauthorizedError  on HTTP 401
 * @throws ForbiddenError     on HTTP 403
 * @throws NotFoundError      on HTTP 404
 * @throws ConflictError      on HTTP 409
 * @throws RateLimitError     on HTTP 429
 * @throws BadGatewayError    on all other non-2xx responses
 */
export function handleFhirApiError(error: AxiosError, context: string): never {
  const body = error.response?.data as Record<string, unknown> | undefined;
  const fallback = error.response?.statusText ?? error.message;
  const message = parseFhirDetail(body, fallback);

  switch (error.response?.status) {
    case 400:
    case 422:
      throw new ValidationError(message);
    case 401:
      throw new UnauthorizedError(message);
    case 403:
      throw new ForbiddenError(message);
    case 404:
      throw new NotFoundError(message);
    case 409:
      throw new ConflictError(message);
    case 429:
      throw new RateLimitError(message);
    default:
      throw new BadGatewayError(
        `${context} API error ${error.response?.status ?? "unknown"}: ${message}`,
      );
  }
}
