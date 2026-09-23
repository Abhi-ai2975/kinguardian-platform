/**
 * Winston logger configuration for the drgodly server.
 *
 * Provides a singleton Winston logger with:
 * - Console transport (colourised, dev-friendly)
 * - Daily-rotating file transports per log level (info / error / warn / debug)
 *
 * Log files are written to LOG_DIR (env var) or "./logs/drgodly" by default.
 * Each file rotates daily and is retained for 2 days before automatic deletion.
 */

import fs from "fs";
import { format as dateFnsFormat } from "date-fns";
import winston from "winston";
import "winston-daily-rotate-file";

/** Directory where rotating log files are stored. */
const LOG_DIR = process.env.LOG_DIR ?? "./logs/drgodly";

// Ensure the log directory exists before Winston tries to write to it.
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

/**
 * Custom Winston format that stamps every log entry with a human-readable
 * timestamp using date-fns ("dd-MM-yyyy HH:mm:ss.SSS").
 */
const timestampFormat = winston.format((info) => {
  info.timestamp = dateFnsFormat(new Date(), "dd-MM-yyyy HH:mm:ss.SSS");
  return info;
});

/**
 * JSON output format used by the file transports.
 * Produces one compact JSON line per log entry.
 */
const jsonFormat = winston.format.printf(
  ({ level, message, timestamp, ...meta }) =>
    JSON.stringify({ timestamp, level, message, ...meta })
);

/**
 * Factory for a Winston format that filters entries to an exact log level.
 * Prevents, e.g., error entries from also appearing in the info log file.
 *
 * @param level - The exact level string to allow through ("info", "error", etc.).
 */
const exactLevel = (level: string) =>
  winston.format((info) => (info.level === level ? info : false))();

/**
 * Builds a DailyRotateFile transport for the given level.
 * Files are named "<level>-DD-MM-YYYY.log" and retained for 2 days.
 *
 * @param level - Log level for this transport ("info" | "error" | "warn" | "debug").
 */
const createDailyRotateTransport = (level: string) =>
  new winston.transports.DailyRotateFile({
    dirname: LOG_DIR,
    filename: `${level}-%DATE%.log`,
    datePattern: "DD-MM-YYYY",
    maxFiles: "2d",
    level,
    zippedArchive: true,
    format: winston.format.combine(
      exactLevel(level),
      timestampFormat(),
      winston.format.errors({ stack: true }),
      jsonFormat
    ),
  });

/** Colourised console transport — active in all environments for immediate feedback. */
const consoleTransport = new winston.transports.Console({
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp(),
    winston.format.printf(({ level, message, timestamp, ...meta }) => {
      const metaStr = Object.keys(meta).length
        ? `\n  META: ${JSON.stringify(meta, null, 2)}`
        : "";
      return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}`;
    })
  ),
});

/** Singleton Winston logger instance — created once and reused across the process. */
let loggerInstance: winston.Logger | null = null;

/**
 * Returns the singleton Winston logger, creating it on first call.
 * Log level is "debug" in development and "info" in production.
 */
export function getWinstonLogger(): winston.Logger {
  if (loggerInstance) return loggerInstance;

  loggerInstance = winston.createLogger({
    // Show all levels in dev; restrict to info+ in prod.
    level: process.env.NODE_ENV === "production" ? "info" : "debug",
    format: winston.format.combine(
      timestampFormat(),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      winston.format.json()
    ),
    defaultMeta: { app: "drgodly" },
    transports: [
      consoleTransport,
      createDailyRotateTransport("info"),
      createDailyRotateTransport("error"),
      createDailyRotateTransport("warn"),
      createDailyRotateTransport("debug"),
    ],
  });

  return loggerInstance;
}
