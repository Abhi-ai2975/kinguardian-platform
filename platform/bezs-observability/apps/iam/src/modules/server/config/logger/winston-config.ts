// lib/server-logger/winston-config.ts
import fs from "fs";
import winston from "winston";
import "winston-daily-rotate-file";
import moment from "moment-timezone";

const LOG_DIR = process.env.LOG_DIR || "../logs/iam";

// Ensure external log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Format timestamp using Moment.js
const momentTimestamp = winston.format((info) => {
  info.timestamp = moment().format("DD-MM-YYYY HH:mm:ss.SSS");
  return info;
});

// Common log format (JSON for structure)
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

// Create a daily rotation transport for a specific log level
const createDailyRotateTransport = (level: string) =>
  new winston.transports.DailyRotateFile({
    dirname: LOG_DIR,
    filename: `${level}-%DATE%.log`,
    datePattern: "DD-MM-YYYY",
    // maxSize: "20m",
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

// Base console transport (for dev environment)
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

// Singleton-safe logger creation
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
