/**
 * @module config/logger/winston-config
 * @description Winston logger with daily-rotate-file transports.
 *              Creates separate log files for each level (info, error, warn, debug)
 *              that rotate daily with 2-day retention and gzip compression.
 *
 * **Transports:**
 * - Console — colorized output for dev environment
 * - Daily rotate files — JSON-formatted, one file per level per day
 *
 * **Log directory:** `LOG_DIR` env var (default: `../logs/iam`)
 * **Log level:** `debug` in development, `info` in production.
 *
 * **Usage:** This is a singleton — call `getWinstonLogger()` anywhere.
 * The `logOperation` utility wraps this for structured start/success/error logging.
 * @category Infrastructure
 */

import fs from "fs";
import winston from "winston";
import "winston-daily-rotate-file";
import moment from "moment-timezone";

const LOG_DIR = process.env.LOG_DIR || "../logs/iam";

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

const momentTimestamp = winston.format((info) => {
  info.timestamp = moment().format("DD-MM-YYYY HH:mm:ss.SSS");
  return info;
});

const jsonFormat = winston.format.printf(
  ({ level, message, timestamp, ...meta }) => {
    return JSON.stringify({
      timestamp,
      level,
      message,
      ...meta,
    });
  },
);

// Exact-level filter — only logs entries whose level matches exactly
const exactLevel = (level: string) =>
  winston.format((info) => (info.level === level ? info : false))();

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
      momentTimestamp(),
      winston.format.errors({ stack: true }),
      jsonFormat,
    ),
  });

const consoleTransport = new winston.transports.Console({
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp(),
    winston.format.printf(({ level, message, timestamp, ...meta }) => {
      const metaString = Object.keys(meta).length
        ? JSON.stringify(meta, null, 2)
        : "";
      return `[${timestamp}] ${level.toUpperCase()}: ${message}${
        metaString ? `\n  META: ${metaString}` : ""
      }`;
    }),
  ),
});

let loggerInstance: winston.Logger | null = null;

export function getWinstonLogger(): winston.Logger {
  if (loggerInstance) return loggerInstance;

  const transports: winston.transport[] = [
    consoleTransport,
    createDailyRotateTransport("info"),
    createDailyRotateTransport("error"),
    createDailyRotateTransport("warn"),
    createDailyRotateTransport("debug"),
  ];

  loggerInstance = winston.createLogger({
    level: process.env.NODE_ENV === "production" ? "info" : "debug",
    format: winston.format.combine(
      momentTimestamp(),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      winston.format.json(),
    ),
    defaultMeta: { app: "bezs" },
    transports,
  });

  return loggerInstance;
}
