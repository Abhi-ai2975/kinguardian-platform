/**
 * Structured operation logger for server-side service methods.
 *
 * Call `logOperation` at the start, success, and error points of every service
 * method to produce consistent, queryable log entries with timing information.
 *
 * Pattern:
 *   const startTimeMs = Date.now();
 *   const operationId = randomUUID();
 *   logOperation("start",   { name: "MyService.method", startTimeMs, context: { operationId } });
 *   logOperation("success", { name: "MyService.method", startTimeMs, context: { operationId } });
 *   logOperation("error",   { name: "MyService.method", startTimeMs, err, context: { operationId } });
 */

import { randomUUID } from "crypto";
import { isAxiosError } from "axios";
import { format as dateFnsFormat } from "date-fns";
import { logger } from ".";
import { formatDuration } from "@/modules/shared/helper";

/** The three lifecycle stages of a logged operation. */
export type LogStage = "start" | "success" | "error";

/** Options passed to `logOperation` for every stage. */
export interface LogOperationOptions {
  /** Fully-qualified name of the operation, e.g. "PatientService.register". */
  name: string;

  /** Unix millisecond timestamp captured at the beginning of the operation. */
  startTimeMs: number;

  /** The caught exception (only used for the "error" stage). */
  err?: unknown;

  /**
   * Optional override for the error name shown in logs.
   * Falls back to `err.name` then "Unknown Error".
   */
  errName?: string;

  /** The data returned on success (used to derive `recordCount` for arrays). */
  data?: unknown;

  /** Arbitrary key/value context — always include at minimum `{ operationId }`. */
  context?: Record<string, unknown>;
}

/**
 * Emits a structured log entry for a single lifecycle stage of a service operation.
 *
 * - "start"   → info-level, records input timestamp
 * - "success" → info-level, records duration and optional record count
 * - "error"   → error-level, records duration and error details
 *
 * @param stage - The lifecycle stage being logged.
 * @param opts  - Logging options (see `LogOperationOptions`).
 */
export function logOperation(stage: LogStage, opts: LogOperationOptions): void {
  const { name, startTimeMs, err, errName, data, context } = opts;

  const now = Date.now();
  const endTime = dateFnsFormat(now, "dd-MM-yyyy HH:mm:ss.SSS");
  const startTime = dateFnsFormat(startTimeMs, "dd-MM-yyyy HH:mm:ss.SSS");
  const { duration, durationMs } = formatDuration(startTimeMs, now);

  // Use operationId from context if provided; generate a fallback UUID otherwise.
  const operationId = context?.operationId ?? randomUUID();

  /** Common metadata included in every log stage. */
  const baseMeta = {
    operationId,
    status: stage,
    startTime,
    endTime,
    duration,
    durationMs,
    ...context,
  };

  switch (stage) {
    case "start":
      // On start we don't yet have an end time or duration.
      logger.info(`[START] ${name}`, {
        ...baseMeta,
        endTime: undefined,
        duration: undefined,
        durationMs: undefined,
      });
      break;

    case "success":
      logger.info(`[SUCCESS] ${name}`, {
        ...baseMeta,
        // Convenience field: how many records were returned (useful for list ops).
        recordCount: Array.isArray(data) ? data.length : undefined,
      });
      break;

    case "error": {
      // Error properties (message, stack) are non-enumerable — serialize explicitly.
      // For AxiosErrors, `err.message` is just Axios's generic
      // "Request failed with status code NNN" — the actual reason (Pydantic
      // validation detail, FHIR OperationOutcome, etc.) lives in the response
      // body, so include it explicitly or this log is useless for debugging.
      const serializedErr = isAxiosError(err)
        ? {
            message: err.message,
            stack: err.stack,
            status: err.response?.status,
            responseData: err.response?.data,
          }
        : err instanceof Error
          ? { message: err.message, stack: err.stack }
          : err;
      logger.error(`[ERROR] ${name}`, {
        ...baseMeta,
        error: serializedErr,
        errorName: errName ?? (err as Error | undefined)?.name ?? "Unknown Error",
      });
      break;
    }
  }
}
