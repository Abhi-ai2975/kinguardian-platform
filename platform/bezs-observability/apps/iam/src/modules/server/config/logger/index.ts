// lib/server-logger/index.ts
import { getWinstonLogger } from "./winston-config";
import type winston from "winston";

const winstonLogger = getWinstonLogger();

// Typed, clean reusable methods
export const logger = {
  info: (message: string, meta?: Record<string, unknown>) => {
    winstonLogger.info(message, meta);
  },
  error: (message: string, meta?: Record<string, unknown>) => {
    winstonLogger.error(message, meta);
  },
  warn: (message: string, meta?: Record<string, unknown>) => {
    winstonLogger.warn(message, meta);
  },
  debug: (message: string, meta?: Record<string, unknown>) => {
    winstonLogger.debug(message, meta);
  },
  verbose: (message: string, meta?: Record<string, unknown>) => {
    winstonLogger.verbose(message, meta);
  },
  // Optional generic method
  log: (level: string, message: string, meta?: Record<string, unknown>) => {
    (winstonLogger as winston.Logger).log(level, message, meta);
  },
};
