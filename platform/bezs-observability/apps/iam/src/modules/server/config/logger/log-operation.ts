import { randomUUID } from "crypto";
import moment from "moment-timezone";
import { logger } from ".";
import { formatDuration } from "@/modules/shared/helper";

export type LogStage = "start" | "success" | "error";

export interface LogOperationOptions {
  name: string;
  userId?: string;
  startTimeMs: number;
  err?: unknown;
  errName?: string;
  data?: unknown;
  inputData?: Record<string, unknown>;
  context?: Record<string, unknown>;
}

export function logOperation(stage: LogStage, opts: LogOperationOptions) {
  const { name, userId, startTimeMs, err, errName, data, inputData, context } =
    opts;

  const now = Date.now();
  const formattedNow = moment(now).format("DD-MM-YYYY HH:mm:ss.SSS");
  const startTime = moment(startTimeMs).format("DD-MM-YYYY HH:mm:ss.SSS");
  const { duration, durationMs } = formatDuration(startTimeMs, now);
  const operationId = context?.operationId ?? randomUUID();

  const baseMeta = {
    operationId,
    status: stage,
    userId,
    startTime,
    endTime: formattedNow,
    duration,
    durationMs,
    ...context,
  };

  switch (stage) {
    case "start":
      logger.info(`[START] ${name}`, {
        ...baseMeta,
        endTime: undefined,
        duration: undefined,
        durationMs: undefined,
        input: inputData,
      });
      break;

    case "success":
      logger.info(`[SUCCESS] ${name}`, {
        ...baseMeta,
        recordCount: Array.isArray(data) ? data.length : undefined,
      });
      break;

    case "error":
      logger.error(`[ERROR] ${name}`, {
        ...baseMeta,
        // error: (err as Error)?.message,
        error: err,
        errorName: errName ?? (err as any)?.name ?? "Unknown Error",
        // stack: (err as Error)?.stack, // optional
      });
      break;
  }
}
