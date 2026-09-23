/**
 * Centralised logger for all server-side code.
 *
 * Import `logger` anywhere in the server module to emit structured log entries.
 * The underlying Winston instance is a singleton — safe to import in multiple files.
 *
 * Usage:
 *   import { logger } from "@/modules/server/config/logger";
 *   logger.info("message", { key: "value" });
 */

import type winston from "winston";
import { getWinstonLogger } from "./winston-config";

const winstonLogger = getWinstonLogger();

/**
 * Typed logger facade wrapping the Winston singleton.
 * All methods accept an optional `meta` object for structured context.
 */
export const logger = {
  /** Log an informational message (normal operation milestones). */
  info: (message: string, meta?: Record<string, unknown>) =>
    winstonLogger.info(message, meta),

  /** Log an error — use for caught exceptions and unexpected failures. */
  error: (message: string, meta?: Record<string, unknown>) =>
    winstonLogger.error(message, meta),

  /** Log a warning — use for degraded-but-recoverable situations. */
  warn: (message: string, meta?: Record<string, unknown>) =>
    winstonLogger.warn(message, meta),

  /** Log a debug message — verbose detail useful during development. */
  debug: (message: string, meta?: Record<string, unknown>) =>
    winstonLogger.debug(message, meta),

  /** Log a verbose message — finer-grained than debug. */
  verbose: (message: string, meta?: Record<string, unknown>) =>
    winstonLogger.verbose(message, meta),

  /**
   * Generic log method for dynamic log levels.
   *
   * @param level   - Winston log level string ("info", "error", etc.).
   * @param message - Log message.
   * @param meta    - Optional structured metadata.
   */
  log: (level: string, message: string, meta?: Record<string, unknown>) =>
    (winstonLogger as winston.Logger).log(level, message, meta),
};
